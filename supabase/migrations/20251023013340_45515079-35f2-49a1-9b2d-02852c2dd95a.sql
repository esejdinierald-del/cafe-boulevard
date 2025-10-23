-- First, clear existing menu items and categories
DELETE FROM menu_items;
DELETE FROM categories;

-- Insert categories with proper display order
INSERT INTO categories (name, display_order) VALUES
('Caffeteria', 1),
('Bevande Frede', 2),
('Birra', 3),
('Alkolike & Vodka & Amaro', 4),
('Vinoteca', 5),
('Coctailes', 6),
('Antipastat', 7),
('Mengjesi', 8),
('Finger Food Chicken', 9),
('Pizza', 10);

-- Insert menu items for Caffeteria
INSERT INTO menu_items (name, price, category_id, available) 
SELECT 'Caj i Nxehtë', 70, id, true FROM categories WHERE name = 'Caffeteria'
UNION ALL
SELECT 'Caj i Nxehtë Bio', 100, id, true FROM categories WHERE name = 'Caffeteria'
UNION ALL
SELECT 'Çokollate', 150, id, true FROM categories WHERE name = 'Caffeteria'
UNION ALL
SELECT 'Kafe Amerikane', 100, id, true FROM categories WHERE name = 'Caffeteria'
UNION ALL
SELECT 'Kafe Dekafeinato', 100, id, true FROM categories WHERE name = 'Caffeteria'
UNION ALL
SELECT 'Kafe Expr', 70, id, true FROM categories WHERE name = 'Caffeteria'
UNION ALL
SELECT 'Kafe Korreto', 150, id, true FROM categories WHERE name = 'Caffeteria'
UNION ALL
SELECT 'Kafe Late', 100, id, true FROM categories WHERE name = 'Caffeteria'
UNION ALL
SELECT 'Kafe Lece-Lece', 120, id, true FROM categories WHERE name = 'Caffeteria'
UNION ALL
SELECT 'Kafe Makiato', 70, id, true FROM categories WHERE name = 'Caffeteria'
UNION ALL
SELECT 'Kakao', 150, id, true FROM categories WHERE name = 'Caffeteria'
UNION ALL
SELECT 'Kapuchino me Kafe', 150, id, true FROM categories WHERE name = 'Caffeteria'
UNION ALL
SELECT 'Salep', 100, id, true FROM categories WHERE name = 'Caffeteria';

-- Insert menu items for Bevande Frede
INSERT INTO menu_items (name, price, category_id, available)
SELECT 'B52', 170, id, true FROM categories WHERE name = 'Bevande Frede'
UNION ALL
SELECT 'Biter', 100, id, true FROM categories WHERE name = 'Bevande Frede'
UNION ALL
SELECT 'Bravo', 150, id, true FROM categories WHERE name = 'Bevande Frede'
UNION ALL
SELECT 'Coca-Cola', 150, id, true FROM categories WHERE name = 'Bevande Frede'
UNION ALL
SELECT 'Çokollate e Ftohtë', 150, id, true FROM categories WHERE name = 'Bevande Frede'
UNION ALL
SELECT 'Crodino', 150, id, true FROM categories WHERE name = 'Bevande Frede'
UNION ALL
SELECT 'Fanta', 150, id, true FROM categories WHERE name = 'Bevande Frede'
UNION ALL
SELECT 'Fresh Ice Tea', 200, id, true FROM categories WHERE name = 'Bevande Frede'
UNION ALL
SELECT 'Ice-Tea', 150, id, true FROM categories WHERE name = 'Bevande Frede'
UNION ALL
SELECT 'Ivi', 150, id, true FROM categories WHERE name = 'Bevande Frede'
UNION ALL
SELECT 'Kakao i Ftohtë', 150, id, true FROM categories WHERE name = 'Bevande Frede'
UNION ALL
SELECT 'Kapucino e Ftohtë', 150, id, true FROM categories WHERE name = 'Bevande Frede'
UNION ALL
SELECT 'Lemon-Soda', 150, id, true FROM categories WHERE name = 'Bevande Frede'
UNION ALL
SELECT 'Lëng Frutash Natyral', 200, id, true FROM categories WHERE name = 'Bevande Frede'
UNION ALL
SELECT 'Lëng Portokalli', 200, id, true FROM categories WHERE name = 'Bevande Frede'
UNION ALL
SELECT 'Neskafe Kanace', 150, id, true FROM categories WHERE name = 'Bevande Frede'
UNION ALL
SELECT 'Pepsi', 150, id, true FROM categories WHERE name = 'Bevande Frede'
UNION ALL
SELECT 'Red Bull', 250, id, true FROM categories WHERE name = 'Bevande Frede'
UNION ALL
SELECT 'Rose', 400, id, true FROM categories WHERE name = 'Bevande Frede'
UNION ALL
SELECT 'Tonik', 150, id, true FROM categories WHERE name = 'Bevande Frede'
UNION ALL
SELECT 'Ujë', 70, id, true FROM categories WHERE name = 'Bevande Frede'
UNION ALL
SELECT 'Ujë Vitamina', 120, id, true FROM categories WHERE name = 'Bevande Frede';

-- Insert menu items for Birra
INSERT INTO menu_items (name, price, category_id, available)
SELECT 'Birrë Pa Alkol', 250, id, true FROM categories WHERE name = 'Birra'
UNION ALL
SELECT 'Budweiser', 250, id, true FROM categories WHERE name = 'Birra'
UNION ALL
SELECT 'Heineken Ita 660ml', 420, id, true FROM categories WHERE name = 'Birra'
UNION ALL
SELECT 'Heineken Shishe 400ml', 250, id, true FROM categories WHERE name = 'Birra'
UNION ALL
SELECT 'Korona', 300, id, true FROM categories WHERE name = 'Birra'
UNION ALL
SELECT 'Kriko Gotë 400ml', 220, id, true FROM categories WHERE name = 'Birra'
UNION ALL
SELECT 'Paulaner', 300, id, true FROM categories WHERE name = 'Birra'
UNION ALL
SELECT 'Paulaner Kristal', 350, id, true FROM categories WHERE name = 'Birra';

-- Insert menu items for Alkolike & Vodka & Amaro
INSERT INTO menu_items (name, price, category_id, available)
SELECT 'Absolut', 300, id, true FROM categories WHERE name = 'Alkolike & Vodka & Amaro'
UNION ALL
SELECT 'Disarono', 250, id, true FROM categories WHERE name = 'Alkolike & Vodka & Amaro'
UNION ALL
SELECT 'Ferrnet Branka', 250, id, true FROM categories WHERE name = 'Alkolike & Vodka & Amaro'
UNION ALL
SELECT 'Jägermeister', 250, id, true FROM categories WHERE name = 'Alkolike & Vodka & Amaro'
UNION ALL
SELECT 'Montenegro', 250, id, true FROM categories WHERE name = 'Alkolike & Vodka & Amaro'
UNION ALL
SELECT 'Vekia Romania', 250, id, true FROM categories WHERE name = 'Alkolike & Vodka & Amaro'
UNION ALL
SELECT 'Vodka', 300, id, true FROM categories WHERE name = 'Alkolike & Vodka & Amaro'
UNION ALL
SELECT 'Xhin Gordons', 250, id, true FROM categories WHERE name = 'Alkolike & Vodka & Amaro'
UNION ALL
SELECT 'Xhin Hindricks', 600, id, true FROM categories WHERE name = 'Alkolike & Vodka & Amaro'
UNION ALL
SELECT 'Bakardi', 250, id, true FROM categories WHERE name = 'Alkolike & Vodka & Amaro'
UNION ALL
SELECT 'Ballatines', 250, id, true FROM categories WHERE name = 'Alkolike & Vodka & Amaro'
UNION ALL
SELECT 'Campari', 200, id, true FROM categories WHERE name = 'Alkolike & Vodka & Amaro'
UNION ALL
SELECT 'Chivas', 350, id, true FROM categories WHERE name = 'Alkolike & Vodka & Amaro'
UNION ALL
SELECT 'Jack Daniels', 350, id, true FROM categories WHERE name = 'Alkolike & Vodka & Amaro'
UNION ALL
SELECT 'JB', 250, id, true FROM categories WHERE name = 'Alkolike & Vodka & Amaro'
UNION ALL
SELECT 'Jonny Walker', 300, id, true FROM categories WHERE name = 'Alkolike & Vodka & Amaro'
UNION ALL
SELECT 'Jonny Walker Black', 350, id, true FROM categories WHERE name = 'Alkolike & Vodka & Amaro'
UNION ALL
SELECT 'Metaksa 5', 300, id, true FROM categories WHERE name = 'Alkolike & Vodka & Amaro'
UNION ALL
SELECT 'Raki', 100, id, true FROM categories WHERE name = 'Alkolike & Vodka & Amaro'
UNION ALL
SELECT 'Sanbuka', 250, id, true FROM categories WHERE name = 'Alkolike & Vodka & Amaro'
UNION ALL
SELECT 'Shoots', 200, id, true FROM categories WHERE name = 'Alkolike & Vodka & Amaro'
UNION ALL
SELECT 'Tequila', 250, id, true FROM categories WHERE name = 'Alkolike & Vodka & Amaro';

-- Insert menu items for Vinoteca
INSERT INTO menu_items (name, price, category_id, available)
SELECT 'Gotë Vere', 180, id, true FROM categories WHERE name = 'Vinoteca'
UNION ALL
SELECT 'Greco di Tufo', 2000, id, true FROM categories WHERE name = 'Vinoteca'
UNION ALL
SELECT 'Luna-M Abruzzo', 2000, id, true FROM categories WHERE name = 'Vinoteca'
UNION ALL
SELECT 'Papale', 4000, id, true FROM categories WHERE name = 'Vinoteca'
UNION ALL
SELECT 'Pinot Grigio', 2000, id, true FROM categories WHERE name = 'Vinoteca'
UNION ALL
SELECT 'Rinforzo', 2800, id, true FROM categories WHERE name = 'Vinoteca'
UNION ALL
SELECT 'Vere 1L', 800, id, true FROM categories WHERE name = 'Vinoteca'
UNION ALL
SELECT 'Vere 375ml', 650, id, true FROM categories WHERE name = 'Vinoteca'
UNION ALL
SELECT 'Vere e Hapur 0.5L', 500, id, true FROM categories WHERE name = 'Vinoteca';

-- Insert menu items for Coctailes
INSERT INTO menu_items (name, price, category_id, available)
SELECT 'A.M.F', 700, id, true FROM categories WHERE name = 'Coctailes'
UNION ALL
SELECT 'Aperol Spritz', 400, id, true FROM categories WHERE name = 'Coctailes'
UNION ALL
SELECT 'Caipirinha', 500, id, true FROM categories WHERE name = 'Coctailes'
UNION ALL
SELECT 'Mohito', 500, id, true FROM categories WHERE name = 'Coctailes'
UNION ALL
SELECT 'Tequila Sunrise', 500, id, true FROM categories WHERE name = 'Coctailes'
UNION ALL
SELECT 'Vodka Sour', 500, id, true FROM categories WHERE name = 'Coctailes';

-- Insert menu items for Antipastat
INSERT INTO menu_items (name, price, category_id, available)
SELECT 'Antipast e Ngrohtë', 1000, id, true FROM categories WHERE name = 'Antipastat'
UNION ALL
SELECT 'Antipast Mix Djathë', 700, id, true FROM categories WHERE name = 'Antipastat'
UNION ALL
SELECT 'Antipast Mix e Ftohtë', 800, id, true FROM categories WHERE name = 'Antipastat'
UNION ALL
SELECT 'Antipaste Mix Proshut', 700, id, true FROM categories WHERE name = 'Antipastat';

-- Insert menu items for Mengjesi
INSERT INTO menu_items (name, price, category_id, available)
SELECT 'Briosh', 60, id, true FROM categories WHERE name = 'Mengjesi'
UNION ALL
SELECT 'Tost Mengjesi', 130, id, true FROM categories WHERE name = 'Mengjesi';

-- Insert menu items for Finger Food Chicken
INSERT INTO menu_items (name, price, category_id, available)
SELECT 'Chicken Finger', 600, id, true FROM categories WHERE name = 'Finger Food Chicken'
UNION ALL
SELECT 'Chicken Wings', 600, id, true FROM categories WHERE name = 'Finger Food Chicken'
UNION ALL
SELECT 'Gjoks Pule i Mbushur', 500, id, true FROM categories WHERE name = 'Finger Food Chicken'
UNION ALL
SELECT 'Grillet Chicken', 600, id, true FROM categories WHERE name = 'Finger Food Chicken'
UNION ALL
SELECT 'Mix Sallcice Zgare', 1000, id, true FROM categories WHERE name = 'Finger Food Chicken'
UNION ALL
SELECT 'Fried Potatoes', 150, id, true FROM categories WHERE name = 'Finger Food Chicken';

-- Insert menu items for Pizza
INSERT INTO menu_items (name, price, category_id, available)
SELECT 'Pizza 4 Djathërat', 500, id, true FROM categories WHERE name = 'Pizza'
UNION ALL
SELECT 'Pizza Cotto Kërpurdhë', 500, id, true FROM categories WHERE name = 'Pizza'
UNION ALL
SELECT 'Pizza Kapricoza', 500, id, true FROM categories WHERE name = 'Pizza'
UNION ALL
SELECT 'Pizza Margarita', 400, id, true FROM categories WHERE name = 'Pizza'
UNION ALL
SELECT 'Pizza Proshut Sallam', 500, id, true FROM categories WHERE name = 'Pizza'
UNION ALL
SELECT 'Pizza Sallam Pikant', 500, id, true FROM categories WHERE name = 'Pizza'
UNION ALL
SELECT 'Pizza Tono', 500, id, true FROM categories WHERE name = 'Pizza'
UNION ALL
SELECT 'Club Sanduiç', 200, id, true FROM categories WHERE name = 'Pizza'
UNION ALL
SELECT 'Fokace Brusketa', 300, id, true FROM categories WHERE name = 'Pizza'
UNION ALL
SELECT 'Kalcone M', 500, id, true FROM categories WHERE name = 'Pizza'
UNION ALL
SELECT 'Kalcone V', 300, id, true FROM categories WHERE name = 'Pizza';