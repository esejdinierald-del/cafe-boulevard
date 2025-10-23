-- Add English name columns to categories and menu_items
ALTER TABLE categories ADD COLUMN IF NOT EXISTS name_en text;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS name_en text;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS description_en text;

-- Update category names with English translations
UPDATE categories SET name_en = 'Coffee Shop' WHERE name = 'Caffeteria';
UPDATE categories SET name_en = 'Cold Drinks' WHERE name = 'Bevande Frede';
UPDATE categories SET name_en = 'Beer' WHERE name = 'Birra';
UPDATE categories SET name_en = 'Spirits & Vodka & Amaro' WHERE name = 'Alkolike & Vodka & Amaro';
UPDATE categories SET name_en = 'Wine' WHERE name = 'Vinoteca';
UPDATE categories SET name_en = 'Cocktails' WHERE name = 'Coctailes';
UPDATE categories SET name_en = 'Appetizers' WHERE name = 'Antipastat';
UPDATE categories SET name_en = 'Breakfast' WHERE name = 'Mengjesi';
UPDATE categories SET name_en = 'Finger Food Chicken' WHERE name = 'Finger Food Chicken';
UPDATE categories SET name_en = 'Pizza' WHERE name = 'Pizza';

-- Update menu items with English translations for Caffeteria
UPDATE menu_items SET name_en = 'Hot Tea' WHERE name = 'Caj i Nxehtë';
UPDATE menu_items SET name_en = 'Bio Hot Tea' WHERE name = 'Caj i Nxehtë Bio';
UPDATE menu_items SET name_en = 'Chocolate' WHERE name = 'Çokollate';
UPDATE menu_items SET name_en = 'American Coffee' WHERE name = 'Kafe Amerikane';
UPDATE menu_items SET name_en = 'Decaf Coffee' WHERE name = 'Kafe Dekafeinato';
UPDATE menu_items SET name_en = 'Espresso' WHERE name = 'Kafe Expr';
UPDATE menu_items SET name_en = 'Corrected Coffee' WHERE name = 'Kafe Korreto';
UPDATE menu_items SET name_en = 'Latte' WHERE name = 'Kafe Late';
UPDATE menu_items SET name_en = 'Iced Coffee' WHERE name = 'Kafe Lece-Lece';
UPDATE menu_items SET name_en = 'Macchiato' WHERE name = 'Kafe Makiato';
UPDATE menu_items SET name_en = 'Cocoa' WHERE name = 'Kakao';
UPDATE menu_items SET name_en = 'Cappuccino with Coffee' WHERE name = 'Kapuchino me Kafe';
UPDATE menu_items SET name_en = 'Salep' WHERE name = 'Salep';

-- Update menu items for Bevande Frede (Cold Drinks)
UPDATE menu_items SET name_en = 'B52' WHERE name = 'B52';
UPDATE menu_items SET name_en = 'Bitter' WHERE name = 'Biter';
UPDATE menu_items SET name_en = 'Bravo' WHERE name = 'Bravo';
UPDATE menu_items SET name_en = 'Coca-Cola' WHERE name = 'Coca-Cola';
UPDATE menu_items SET name_en = 'Cold Chocolate' WHERE name = 'Çokollate e Ftohtë';
UPDATE menu_items SET name_en = 'Crodino' WHERE name = 'Crodino';
UPDATE menu_items SET name_en = 'Fanta' WHERE name = 'Fanta';
UPDATE menu_items SET name_en = 'Fresh Ice Tea' WHERE name = 'Fresh Ice Tea';
UPDATE menu_items SET name_en = 'Ice Tea' WHERE name = 'Ice-Tea';
UPDATE menu_items SET name_en = 'Ivi' WHERE name = 'Ivi';
UPDATE menu_items SET name_en = 'Cold Cocoa' WHERE name = 'Kakao i Ftohtë';
UPDATE menu_items SET name_en = 'Cold Cappuccino' WHERE name = 'Kapucino e Ftohtë';
UPDATE menu_items SET name_en = 'Lemon Soda' WHERE name = 'Lemon-Soda';
UPDATE menu_items SET name_en = 'Natural Fruit Juice' WHERE name = 'Lëng Frutash Natyral';
UPDATE menu_items SET name_en = 'Orange Juice' WHERE name = 'Lëng Portokalli';
UPDATE menu_items SET name_en = 'Iced Nescafe' WHERE name = 'Neskafe Kanace';
UPDATE menu_items SET name_en = 'Pepsi' WHERE name = 'Pepsi';
UPDATE menu_items SET name_en = 'Red Bull' WHERE name = 'Red Bull';
UPDATE menu_items SET name_en = 'Rose' WHERE name = 'Rose';
UPDATE menu_items SET name_en = 'Tonic' WHERE name = 'Tonik';
UPDATE menu_items SET name_en = 'Water' WHERE name = 'Ujë';
UPDATE menu_items SET name_en = 'Vitamin Water' WHERE name = 'Ujë Vitamina';

-- Update menu items for Birra (Beer)
UPDATE menu_items SET name_en = 'Non-Alcoholic Beer' WHERE name = 'Birrë Pa Alkol';
UPDATE menu_items SET name_en = 'Budweiser' WHERE name = 'Budweiser';
UPDATE menu_items SET name_en = 'Heineken Italy 660ml' WHERE name = 'Heineken Ita 660ml';
UPDATE menu_items SET name_en = 'Heineken Bottle 400ml' WHERE name = 'Heineken Shishe 400ml';
UPDATE menu_items SET name_en = 'Corona' WHERE name = 'Korona';
UPDATE menu_items SET name_en = 'Kriko Glass 400ml' WHERE name = 'Kriko Gotë 400ml';
UPDATE menu_items SET name_en = 'Paulaner' WHERE name = 'Paulaner';
UPDATE menu_items SET name_en = 'Paulaner Crystal' WHERE name = 'Paulaner Kristal';

-- Update menu items for Alkolike & Vodka & Amaro (Spirits)
UPDATE menu_items SET name_en = 'Absolut' WHERE name = 'Absolut';
UPDATE menu_items SET name_en = 'Disaronno' WHERE name = 'Disarono';
UPDATE menu_items SET name_en = 'Fernet Branca' WHERE name = 'Ferrnet Branka';
UPDATE menu_items SET name_en = 'Jägermeister' WHERE name = 'Jägermeister';
UPDATE menu_items SET name_en = 'Montenegro' WHERE name = 'Montenegro';
UPDATE menu_items SET name_en = 'Vekia Romania' WHERE name = 'Vekia Romania';
UPDATE menu_items SET name_en = 'Vodka' WHERE name = 'Vodka';
UPDATE menu_items SET name_en = 'Gin Gordon''s' WHERE name = 'Xhin Gordons';
UPDATE menu_items SET name_en = 'Gin Hendrick''s' WHERE name = 'Xhin Hindricks';
UPDATE menu_items SET name_en = 'Bacardi' WHERE name = 'Bakardi';
UPDATE menu_items SET name_en = 'Ballantine''s' WHERE name = 'Ballatines';
UPDATE menu_items SET name_en = 'Campari' WHERE name = 'Campari';
UPDATE menu_items SET name_en = 'Chivas' WHERE name = 'Chivas';
UPDATE menu_items SET name_en = 'Jack Daniels' WHERE name = 'Jack Daniels';
UPDATE menu_items SET name_en = 'JB' WHERE name = 'JB';
UPDATE menu_items SET name_en = 'Johnny Walker' WHERE name = 'Jonny Walker';
UPDATE menu_items SET name_en = 'Johnny Walker Black' WHERE name = 'Jonny Walker Black';
UPDATE menu_items SET name_en = 'Metaxa 5' WHERE name = 'Metaksa 5';
UPDATE menu_items SET name_en = 'Raki' WHERE name = 'Raki';
UPDATE menu_items SET name_en = 'Sambuca' WHERE name = 'Sanbuka';
UPDATE menu_items SET name_en = 'Shots' WHERE name = 'Shoots';
UPDATE menu_items SET name_en = 'Tequila' WHERE name = 'Tequila';

-- Update menu items for Vinoteca (Wine)
UPDATE menu_items SET name_en = 'Glass of Wine' WHERE name = 'Gotë Vere';
UPDATE menu_items SET name_en = 'Greco di Tufo' WHERE name = 'Greco di Tufo';
UPDATE menu_items SET name_en = 'Luna-M Abruzzo' WHERE name = 'Luna-M Abruzzo';
UPDATE menu_items SET name_en = 'Papale' WHERE name = 'Papale';
UPDATE menu_items SET name_en = 'Pinot Grigio' WHERE name = 'Pinot Grigio';
UPDATE menu_items SET name_en = 'Rinforzo' WHERE name = 'Rinforzo';
UPDATE menu_items SET name_en = 'Wine 1L' WHERE name = 'Vere 1L';
UPDATE menu_items SET name_en = 'Wine 375ml' WHERE name = 'Vere 375ml';
UPDATE menu_items SET name_en = 'Open Wine 0.5L' WHERE name = 'Vere e Hapur 0.5L';

-- Update menu items for Coctailes (Cocktails)
UPDATE menu_items SET name_en = 'A.M.F' WHERE name = 'A.M.F';
UPDATE menu_items SET name_en = 'Aperol Spritz' WHERE name = 'Aperol Spritz';
UPDATE menu_items SET name_en = 'Caipirinha' WHERE name = 'Caipirinha';
UPDATE menu_items SET name_en = 'Mojito' WHERE name = 'Mohito';
UPDATE menu_items SET name_en = 'Tequila Sunrise' WHERE name = 'Tequila Sunrise';
UPDATE menu_items SET name_en = 'Vodka Sour' WHERE name = 'Vodka Sour';

-- Update menu items for Antipastat (Appetizers)
UPDATE menu_items SET name_en = 'Hot Appetizer' WHERE name = 'Antipast e Ngrohtë';
UPDATE menu_items SET name_en = 'Mixed Cheese Platter' WHERE name = 'Antipast Mix Djathë';
UPDATE menu_items SET name_en = 'Cold Mixed Platter' WHERE name = 'Antipast Mix e Ftohtë';
UPDATE menu_items SET name_en = 'Mixed Prosciutto Platter' WHERE name = 'Antipaste Mix Proshut';

-- Update menu items for Mengjesi (Breakfast)
UPDATE menu_items SET name_en = 'Brioche' WHERE name = 'Briosh';
UPDATE menu_items SET name_en = 'Breakfast Toast' WHERE name = 'Tost Mengjesi';

-- Update menu items for Finger Food Chicken
UPDATE menu_items SET name_en = 'Chicken Fingers' WHERE name = 'Chicken Finger';
UPDATE menu_items SET name_en = 'Chicken Wings' WHERE name = 'Chicken Wings';
UPDATE menu_items SET name_en = 'Stuffed Chicken Breast' WHERE name = 'Gjoks Pule i Mbushur';
UPDATE menu_items SET name_en = 'Grilled Chicken' WHERE name = 'Grillet Chicken';
UPDATE menu_items SET name_en = 'Mixed Grilled Sausages' WHERE name = 'Mix Sallcice Zgare';
UPDATE menu_items SET name_en = 'Fried Potatoes' WHERE name = 'Fried Potatoes';

-- Update menu items for Pizza
UPDATE menu_items SET name_en = 'Four Cheese Pizza' WHERE name = 'Pizza 4 Djathërat';
UPDATE menu_items SET name_en = 'Ham & Mushroom Pizza' WHERE name = 'Pizza Cotto Kërpurdhë';
UPDATE menu_items SET name_en = 'Capricciosa Pizza' WHERE name = 'Pizza Kapricoza';
UPDATE menu_items SET name_en = 'Margherita Pizza' WHERE name = 'Pizza Margarita';
UPDATE menu_items SET name_en = 'Prosciutto & Salami Pizza' WHERE name = 'Pizza Proshut Sallam';
UPDATE menu_items SET name_en = 'Spicy Salami Pizza' WHERE name = 'Pizza Sallam Pikant';
UPDATE menu_items SET name_en = 'Tuna Pizza' WHERE name = 'Pizza Tono';
UPDATE menu_items SET name_en = 'Club Sandwich' WHERE name = 'Club Sanduiç';
UPDATE menu_items SET name_en = 'Focaccia Bruschetta' WHERE name = 'Fokace Brusketa';
UPDATE menu_items SET name_en = 'Calzone M' WHERE name = 'Kalcone M';
UPDATE menu_items SET name_en = 'Calzone V' WHERE name = 'Kalcone V';