import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, Plus, Trash2, Edit, Save, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/boulevard-logo.png";
import coffeeBackground from "@/assets/coffee-background.png";

interface Category {
  id: string;
  name: string;
  display_order: number;
}

interface MenuItem {
  id: string;
  category_id: string;
  name: string;
  description: string;
  price: number;
  image_url: string | null;
  available: boolean;
  offer_price: number | null;
  offer_start_time: string | null;
  offer_end_time: string | null;
}

const ManagerDashboard = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState("");
  const [newItem, setNewItem] = useState({
    name: "",
    description: "",
    price: "",
    category_id: "",
    image_url: ""
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
    fetchData();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate('/manager-login');
      return;
    }

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'manager')
      .single();

    if (!roleData) {
      toast.error("Nuk keni akses");
      navigate('/');
    }
  };

  const fetchData = async () => {
    try {
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('*')
        .order('display_order');

      const { data: itemsData } = await supabase
        .from('menu_items')
        .select('*');

      setCategories(categoriesData || []);
      setMenuItems(itemsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;

    try {
      const { error } = await supabase
        .from('categories')
        .insert({ 
          name: newCategory,
          display_order: categories.length + 1
        });

      if (error) throw error;

      toast.success("Kategoria u shtua");
      setNewCategory("");
      fetchData();
    } catch (error) {
      console.error('Error adding category:', error);
      toast.error("Gabim në shtimin e kategorisë");
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success("Kategoria u fshi");
      fetchData();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error("Gabim në fshirjen e kategorisë");
    }
  };

  const handleUpdateCategory = async (id: string, name: string) => {
    try {
      const { error } = await supabase
        .from('categories')
        .update({ name })
        .eq('id', id);

      if (error) throw error;

      toast.success("Kategoria u përditësua");
      setEditingCategory(null);
      fetchData();
    } catch (error) {
      console.error('Error updating category:', error);
      toast.error("Gabim në përditësimin e kategorisë");
    }
  };

  const handleAddItem = async () => {
    if (!newItem.name || !newItem.price || !newItem.category_id) {
      toast.error("Plotësoni fushat e nevojshme");
      return;
    }

    try {
      const { error } = await supabase
        .from('menu_items')
        .insert({
          name: newItem.name,
          description: newItem.description,
          price: parseInt(newItem.price),
          category_id: newItem.category_id,
          image_url: newItem.image_url || null,
          available: true
        });

      if (error) throw error;

      toast.success("Artikulli u shtua");
      setNewItem({ name: "", description: "", price: "", category_id: "", image_url: "" });
      setImagePreview(null);
      fetchData();
    } catch (error) {
      console.error('Error adding item:', error);
      toast.error("Gabim në shtimin e artikullit");
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success("Artikulli u fshi");
      fetchData();
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error("Gabim në fshirjen e artikullit");
    }
  };

  const handleToggleAvailable = async (id: string, available: boolean) => {
    try {
      const { error } = await supabase
        .from('menu_items')
        .update({ available: !available })
        .eq('id', id);

      if (error) throw error;

      toast.success(available ? "Artikulli u çaktivizua" : "Artikulli u aktivizua");
      fetchData();
    } catch (error) {
      console.error('Error toggling item:', error);
      toast.error("Gabim");
    }
  };

  const handleImageUpload = async (file: File) => {
    try {
      setUploadingImage(true);
      
      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('menu-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('menu-images')
        .getPublicUrl(filePath);

      setImagePreview(publicUrl);
      setNewItem({ ...newItem, image_url: publicUrl });
      toast.success("Fotoja u ngarkua me sukses");
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error("Gabim në ngarkimin e fotos");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleUpdateItem = async (id: string, name: string, price: number, imageUrl: string, offerPrice?: number | null, offerStart?: string | null, offerEnd?: string | null) => {
    try {
      const { error } = await supabase
        .from('menu_items')
        .update({ 
          name, 
          price, 
          image_url: imageUrl || null,
          offer_price: offerPrice || null,
          offer_start_time: offerStart || null,
          offer_end_time: offerEnd || null
        })
        .eq('id', id);

      if (error) throw error;

      toast.success("Artikulli u përditësua");
      setEditingItem(null);
      fetchData();
    } catch (error) {
      console.error('Error updating item:', error);
      toast.error("Gabim në përditësimin e artikullit");
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Duke ngarkuar...</div>;
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${coffeeBackground})` }} />
      <div className="absolute inset-0 bg-gradient-to-br from-black/65 via-black/45 to-black/65 backdrop-blur-[1px]" />

      <div className="relative z-10 container mx-auto px-4 py-6 max-w-6xl">
        <div className="flex items-center justify-between mb-8 glass-premium rounded-3xl p-6 shadow-[var(--shadow-elegant)]">
          <div className="flex items-center gap-4">
            <img src={logo} alt="Logo" className="h-14 w-auto drop-shadow-lg" />
            <h1 className="text-2xl font-display font-bold gradient-text-gold">Manager Dashboard</h1>
          </div>
          <Button variant="burgundy" onClick={handleLogout} className="font-display font-bold">
            <LogOut className="mr-2 h-5 w-5" />
            Dil
          </Button>
        </div>

        <Tabs defaultValue="categories" className="space-y-6">
          <TabsList className="glass-premium h-14 rounded-2xl shadow-lg">
            <TabsTrigger value="categories" className="rounded-xl font-display font-semibold text-base data-[state=active]:bg-secondary data-[state=active]:text-foreground">
              Kategoritë
            </TabsTrigger>
            <TabsTrigger value="items" className="rounded-xl font-display font-semibold text-base data-[state=active]:bg-secondary data-[state=active]:text-foreground">
              Artikujt
            </TabsTrigger>
          </TabsList>

          <TabsContent value="categories" className="space-y-5">
            <Card className="glass-premium p-6 rounded-3xl shadow-[var(--shadow-elegant)]">
              <h2 className="text-xl font-display font-bold mb-5 gradient-text-gold">Shto Kategori të Re</h2>
              <div className="flex gap-3">
                <Input
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="Emri i kategorisë"
                  className="glass-premium h-12 rounded-2xl text-base"
                />
                <Button onClick={handleAddCategory} variant="gold" size="lg" className="font-display font-bold">
                  <Plus className="mr-2 h-5 w-5" />
                  Shto
                </Button>
              </div>
            </Card>

            <div className="grid gap-5">
              {categories.map((category) => (
                <Card key={category.id} className="glass-premium p-5 rounded-3xl shadow-[var(--shadow-elegant)] hover:shadow-[var(--shadow-float)] transition-all duration-500">
                  <div className="flex items-center justify-between">
                    {editingCategory === category.id ? (
                      <>
                        <Input
                          defaultValue={category.name}
                          id={`cat-${category.id}`}
                          className="glass-premium flex-1 h-12 rounded-2xl text-base"
                        />
                        <div className="flex gap-2 ml-3">
                          <Button
                            size="icon"
                            variant="gold"
                            className="h-12 w-12 rounded-2xl"
                            onClick={() => {
                              const input = document.getElementById(`cat-${category.id}`) as HTMLInputElement;
                              handleUpdateCategory(category.id, input.value);
                            }}
                          >
                            <Save className="h-5 w-5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-12 w-12 rounded-2xl"
                            onClick={() => setEditingCategory(null)}
                          >
                            <X className="h-5 w-5" />
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="font-display font-bold text-lg">{category.name}</span>
                        <div className="flex gap-2">
                          <Button
                            size="icon"
                            variant="premium"
                            className="h-11 w-11 rounded-2xl"
                            onClick={() => setEditingCategory(category.id)}
                          >
                            <Edit className="h-5 w-5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="destructive"
                            onClick={() => handleDeleteCategory(category.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="items" className="space-y-4">
            <Card className="glass-effect p-4">
              <h2 className="text-lg font-bold mb-4">Shto Artikull të Ri</h2>
              <div className="grid gap-4">
                <Input
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  placeholder="Emri"
                  className="glass-effect"
                />
                <Input
                  value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  placeholder="Përshkrimi"
                  className="glass-effect"
                />
                <Input
                  type="number"
                  value={newItem.price}
                  onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                  placeholder="Çmimi (Lekë)"
                  className="glass-effect"
                />
                
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Ngarko Foto</label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file);
                    }}
                    disabled={uploadingImage}
                    className="glass-effect"
                  />
                  {uploadingImage && <p className="text-sm text-muted-foreground">Duke ngarkuar...</p>}
                  {imagePreview && (
                    <div className="relative w-32 h-32">
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover rounded-lg" />
                      <Button
                        size="icon"
                        variant="destructive"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                        onClick={() => {
                          setImagePreview(null);
                          setNewItem({ ...newItem, image_url: "" });
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                <select
                  value={newItem.category_id}
                  onChange={(e) => setNewItem({ ...newItem, category_id: e.target.value })}
                  className="glass-effect p-2 rounded-md"
                >
                  <option value="">Zgjidh kategorinë</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                <Button onClick={handleAddItem} disabled={uploadingImage}>
                  <Plus className="mr-2 h-4 w-4" />
                  Shto Artikull
                </Button>
              </div>
            </Card>

            <div className="grid gap-4">
              {menuItems.map((item) => {
                const category = categories.find(c => c.id === item.category_id);
                return (
                  <Card key={item.id} className="glass-effect p-4">
                    {editingItem === item.id ? (
                      <div className="space-y-4">
                        <div className="flex gap-4">
                          {item.image_url && (
                            <img src={item.image_url} alt={item.name} className="w-24 h-24 object-cover rounded-lg" />
                          )}
                          <div className="flex-1 space-y-3">
                            <Input
                              defaultValue={item.name}
                              id={`item-name-${item.id}`}
                              placeholder="Emri"
                              className="glass-effect"
                            />
                            <Input
                              type="number"
                              defaultValue={item.price}
                              id={`item-price-${item.id}`}
                              placeholder="Çmimi"
                              className="glass-effect"
                            />
                            <Input
                              defaultValue={item.image_url || ""}
                              id={`item-image-${item.id}`}
                              placeholder="URL e fotos"
                              className="glass-effect"
                            />
                            <p className="text-xs text-muted-foreground">Kategoria: {category?.name}</p>
                            
                            {/* Offer fields */}
                            <div className="border-t border-border/50 pt-3 mt-3">
                              <p className="text-sm font-semibold mb-2 text-destructive">🔥 Ofertë</p>
                              <div className="grid grid-cols-3 gap-2">
                                <Input
                                  type="number"
                                  defaultValue={item.offer_price || ""}
                                  id={`item-offer-price-${item.id}`}
                                  placeholder="Çmim oferte"
                                  className="glass-effect"
                                />
                                <Input
                                  type="time"
                                  defaultValue={item.offer_start_time?.slice(0, 5) || ""}
                                  id={`item-offer-start-${item.id}`}
                                  className="glass-effect"
                                />
                                <Input
                                  type="time"
                                  defaultValue={item.offer_end_time?.slice(0, 5) || ""}
                                  id={`item-offer-end-${item.id}`}
                                  className="glass-effect"
                                />
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">Çmimi ofertës | Ora fillimit | Ora mbarimit</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="gold"
                            onClick={() => {
                              const nameInput = document.getElementById(`item-name-${item.id}`) as HTMLInputElement;
                              const priceInput = document.getElementById(`item-price-${item.id}`) as HTMLInputElement;
                              const imageInput = document.getElementById(`item-image-${item.id}`) as HTMLInputElement;
                              const offerPriceInput = document.getElementById(`item-offer-price-${item.id}`) as HTMLInputElement;
                              const offerStartInput = document.getElementById(`item-offer-start-${item.id}`) as HTMLInputElement;
                              const offerEndInput = document.getElementById(`item-offer-end-${item.id}`) as HTMLInputElement;
                              handleUpdateItem(
                                item.id, 
                                nameInput.value, 
                                parseInt(priceInput.value), 
                                imageInput.value,
                                offerPriceInput.value ? parseInt(offerPriceInput.value) : null,
                                offerStartInput.value || null,
                                offerEndInput.value || null
                              );
                            }}
                          >
                            <Save className="mr-2 h-4 w-4" />
                            Ruaj
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingItem(null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-4">
                        {item.image_url && (
                          <img src={item.image_url} alt={item.name} className="w-24 h-24 object-cover rounded-lg" />
                        )}
                        <div className="flex-1">
                          <h3 className="font-bold">{item.name}</h3>
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                          <p className="text-primary font-bold">{item.price} Lekë</p>
                          <p className="text-xs text-muted-foreground">Kategoria: {category?.name}</p>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button
                            size="sm"
                            variant="premium"
                            onClick={() => setEditingItem(item.id)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant={item.available ? "default" : "outline"}
                            onClick={() => handleToggleAvailable(item.id, item.available)}
                          >
                            {item.available ? "Aktiv" : "Çaktiv"}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ManagerDashboard;
