import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, Plus, Trash2, Edit, Save, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/universal-caffe-logo.png";
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

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Duke ngarkuar...</div>;
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${coffeeBackground})` }} />
      <div className="absolute inset-0 bg-background/30 backdrop-blur-[2px]" />

      <div className="relative z-10 container mx-auto px-4 py-6 max-w-6xl">
        <div className="flex items-center justify-between mb-6 glass-effect rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Logo" className="h-10 w-auto" />
            <h1 className="text-xl font-bold">Manager Dashboard</h1>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Dil
          </Button>
        </div>

        <Tabs defaultValue="categories" className="space-y-4">
          <TabsList className="glass-effect">
            <TabsTrigger value="categories">Kategoritë</TabsTrigger>
            <TabsTrigger value="items">Artikujt</TabsTrigger>
          </TabsList>

          <TabsContent value="categories" className="space-y-4">
            <Card className="glass-effect p-4">
              <h2 className="text-lg font-bold mb-4">Shto Kategori të Re</h2>
              <div className="flex gap-2">
                <Input
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="Emri i kategorisë"
                  className="glass-effect"
                />
                <Button onClick={handleAddCategory}>
                  <Plus className="mr-2 h-4 w-4" />
                  Shto
                </Button>
              </div>
            </Card>

            <div className="grid gap-4">
              {categories.map((category) => (
                <Card key={category.id} className="glass-effect p-4">
                  <div className="flex items-center justify-between">
                    {editingCategory === category.id ? (
                      <>
                        <Input
                          defaultValue={category.name}
                          id={`cat-${category.id}`}
                          className="glass-effect flex-1"
                        />
                        <div className="flex gap-2 ml-2">
                          <Button
                            size="icon"
                            onClick={() => {
                              const input = document.getElementById(`cat-${category.id}`) as HTMLInputElement;
                              handleUpdateCategory(category.id, input.value);
                            }}
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => setEditingCategory(null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="font-semibold">{category.name}</span>
                        <div className="flex gap-2">
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => setEditingCategory(category.id)}
                          >
                            <Edit className="h-4 w-4" />
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
                <Input
                  value={newItem.image_url}
                  onChange={(e) => setNewItem({ ...newItem, image_url: e.target.value })}
                  placeholder="URL e fotos (opsionale)"
                  className="glass-effect"
                />
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
                <Button onClick={handleAddItem}>
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
