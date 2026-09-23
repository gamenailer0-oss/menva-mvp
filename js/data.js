/**
 * MENVA — Restaurant & Dish Data
 * Gauchos is the first pilot restaurant with real scanned 3D models.
 * Nutrition data sourced from USDA/FatSecret averages for similar dishes.
 */

const MENVA_DATA = {
  restaurants: [
    {
      id: "gauchos",
      slug: "g", // short path used in table QR codes: /g/<table>
      name: "Gauchos",
      displayName: "Gauchos",
      tagline: "Steakhouse & Grill",
      location: "Lahore",
      area: "Gulberg III",
      theme: "gauchos",
      real: true,
      pilot: true,
      cuisine: "Steakhouse",
      description: "Argentine-inspired steakhouse in the heart of Gulberg. Supreme cuts, oakwood-smoked brisket, and signature sauces — crafted with intention.",
      address: "56-B3 Mian Mehmood Ali Kasuri Rd, Block B3, Gulberg III, Lahore",
      official: "https://gauchos.com.pk/",
      source: "https://www.foodpanda.pk/restaurant/w7xf/gauchos-steak-house",
      sourceLabel: "Foodpanda listing",
      tags: ["Steakhouse", "Pakistani"],
      dishes: [
        {
          id: "steak-sandwich",
          name: "Signature Steak Sandwich",
          category: "Sandwiches",
          description: "Tender sliced steak layered with fresh greens, house aioli, and artisan bread. A Gauchos classic.",
          price: 1295,
          glb: "models/gauchos-steak-sandwich.glb",
          usdz: "models/gauchos-steak-sandwich.usdz",
          tags: ["Signature", "3D Scan"],
          scanNote: "Photogrammetry scan of the actual dish. Proportions are accurate to the real serving.",
          nutrition: {
            serving: "1 sandwich (~200g)",
            calories: 459,
            protein: "30g",
            fat: "14g",
            carbs: "52g",
            cut: "Thinly sliced steak",
            weight: "200g",
          },
        },
        {
          id: "steak-main",
          name: "Premium Ribeye Steak",
          category: "Signature Cuts",
          description: "Oakwood-grilled ribeye with supreme marbling. Served with sautéed vegetables and steak fries.",
          price: 3495,
          glb: "models/gauchos-steak-main.glb",
          usdz: "models/gauchos-steak-main.usdz",
          tags: ["Signature Cut", "3D Scan"],
          scanNote: "Photogrammetry scan of the actual dish. Proportions are accurate to the real serving.",
          nutrition: {
            serving: "1 steak (~250g)",
            calories: 480,
            protein: "38g",
            fat: "32g",
            carbs: "0g",
            cut: "Ribeye, oakwood-grilled",
            weight: "250g",
          },
        },
        {
          id: "grilled-chicken-sandwich",
          name: "Grilled Chicken Sandwich",
          category: "Sandwiches",
          description: "Grilled chicken breast with fresh greens and house sauce.",
          price: 1295,
          glb: null,
          usdz: null,
          tags: ["Popular"],
          nutrition: {
            serving: "1 sandwich (~180g)",
            calories: 420,
            protein: "28g",
            fat: "16g",
            carbs: "38g",
            cut: "Grilled chicken breast",
            weight: "180g",
          },
        },
        {
          id: "tomahawk",
          name: "Tomahawk Steak",
          category: "Signature Cuts",
          description: "Gauchos signature cut. Marinated for 48 hours, generously marbled throughout.",
          price: 5495,
          glb: null,
          usdz: null,
          tags: ["Signature Cut"],
          nutrition: {
            serving: "1 steak (~400g)",
            calories: 780,
            protein: "62g",
            fat: "52g",
            carbs: "0g",
            cut: "Tomahawk, 48h marinated",
            weight: "400g",
          },
        },
        {
          id: "smoky-brisket-burger",
          name: "The Smoky Brisket Burger",
          category: "Burgers",
          description: "14-hour oakwood-smoked brisket in a burger. Gauchos special.",
          price: 1895,
          glb: null,
          usdz: null,
          tags: ["Smoked House"],
          nutrition: {
            serving: "1 burger (~250g)",
            calories: 620,
            protein: "34g",
            fat: "28g",
            carbs: "48g",
            cut: "Smoked brisket patty",
            weight: "250g",
          },
        },
        {
          id: "beef-stroganoff",
          name: "Beef Stroganoff",
          category: "Mains",
          description: "Thinly sliced juicy strips of beef fillet in sour cream and mushroom sauce. Served with butter rice.",
          price: 2295,
          glb: null,
          usdz: null,
          tags: [],
          nutrition: {
            serving: "1 plate (~350g)",
            calories: 580,
            protein: "32g",
            fat: "28g",
            carbs: "42g",
            cut: "Beef fillet strips",
            weight: "350g",
          },
        },
        {
          id: "surf-turf",
          name: "Surf & Turf",
          category: "Mains",
          description: "Prawns and beef complimented with rich bone marrow. Served with sautéed vegetables and creamy mashed potatoes.",
          price: 3495,
          glb: null,
          usdz: null,
          tags: [],
          nutrition: {
            serving: "1 plate (~400g)",
            calories: 650,
            protein: "42g",
            fat: "34g",
            carbs: "28g",
            cut: "Beef fillet + prawns",
            weight: "400g",
          },
        },
        {
          id: "chicken-parmigiana",
          name: "Chicken Parmigiana",
          category: "Mains",
          description: "Parmesan-crusted chicken breast with tomato sauce and creamy parmesan sauce on fettuccine.",
          price: 2395,
          glb: null,
          usdz: null,
          tags: [],
          nutrition: {
            serving: "1 plate (~400g)",
            calories: 720,
            protein: "38g",
            fat: "32g",
            carbs: "52g",
            cut: "Chicken breast",
            weight: "400g",
          },
        },
      ],
    },
    // Future restaurants added here
  ],
};

// Format price as PKR
function formatPrice(value) {
  return `PKR ${new Intl.NumberFormat('en-PK').format(value)}`;
}

// Find helpers
function findRestaurant(id) {
  return MENVA_DATA.restaurants.find(r => r.id === id);
}

// Accepts the short slug (/g/12) or the full id (/gauchos/12)
function findRestaurantBySlug(slug) {
  const s = slug.toLowerCase();
  return MENVA_DATA.restaurants.find(r => r.slug === s || r.id === s);
}

function findDish(restaurant, dishId) {
  return restaurant.dishes.find(d => d.id === dishId);
}

// Full Gauchos menu from Foodpanda (sourced September 2026)
const GAUCHOS_FULL_MENU = {
  restaurant: "gauchos",
  source: "https://www.foodpanda.pk/restaurant/w7xf/gauchos-steak-house",
  sourceLabel: "Foodpanda",
  retrieved: "September 2026",
  notice: "Menu snapshot from Foodpanda. Prices and availability may vary. Confirm directly with the restaurant.",
  items: [
    { name: "Grilled Chicken Sandwich", category: "Sandwiches", price: 1295, description: "Grilled chicken breast with fresh greens." },
    { name: "Stacked Club Sandwich", category: "Sandwiches", price: 1395, description: "Triple-decker club with chicken and fresh vegetables." },
    { name: "Smoked Brisket in A Baguette", category: "Sandwiches", price: 2695, description: "14-hour smoked brisket in a fresh baguette." },
    { name: "Philly Cheese Steak Sandwich", category: "Sandwiches", price: 1495, description: "Classic Philly with melted cheese and sliced steak." },
    { name: "Swiss Mushroom Melt Burger", category: "Burgers", price: 1995, description: "Beef patty with Swiss cheese and sautéed mushrooms." },
    { name: "The Steak House Burger", category: "Burgers", price: 1895, description: "Premium steak house style burger." },
    { name: "The Smoky Brisket Burger", category: "Burgers", price: 1895, description: "Smoked brisket patty with house sauce." },
    { name: "Gauchos Smashed Burger", category: "Burgers", price: 1595, description: "Smashed style burger with special sauce." },
    { name: "Crunchy Kentucky Burger", category: "Burgers", price: 1495, description: "Crispy fried chicken burger." },
    { name: "Premium Ribeye Pan Seared", category: "Steaks", price: 4995, description: "Pan-seared premium ribeye. From." },
    { name: "Premium Ribeye Chargrilled", category: "Steaks", price: 4695, description: "Chargrilled premium ribeye. From." },
    { name: "Premium T-Bone Pan Seared", category: "Steaks", price: 4795, description: "Pan-seared premium T-bone. From." },
    { name: "Ribeye Pan Seared", category: "Steaks", price: 3495, description: "Pan-seared ribeye. From." },
    { name: "Ribeye Chargrilled", category: "Steaks", price: 3195, description: "Chargrilled ribeye. From." },
    { name: "Filet Mignon Pan Seared", category: "Steaks", price: 3895, description: "Pan-seared filet mignon. From." },
    { name: "Filet Mignon Chargrilled", category: "Steaks", price: 3595, description: "Chargrilled filet mignon. From." },
    { name: "T-Bone Pan Seared", category: "Steaks", price: 3295, description: "Pan-seared T-bone. From." },
    { name: "Sirloin Pan Seared", category: "Steaks", price: 3795, description: "Pan-seared sirloin. From." },
    { name: "Sirloin Chargrilled", category: "Steaks", price: 3495, description: "Chargrilled sirloin. From." },
    { name: "Tomahawk", category: "Signature Cuts", price: 5495, description: "Gauchos signature cut. 48h marinated. From." },
    { name: "Whole Tenderloin", category: "Signature Cuts", price: 5995, description: "Whole tenderloin, marinated. From." },
    { name: "Stuffed Chicken", category: "Mains", price: 2495, description: "Grilled chicken breast stuffed with spinach, cheese, sun-dried tomatoes and mushrooms." },
    { name: "Chicken Parmigiana", category: "Mains", price: 2395, description: "Parmesan-crusted chicken with tomato and parmesan sauce on fettuccine." },
    { name: "Scottish Chicken", category: "Mains", price: 2295, description: "Grilled chicken with green olives, sun-dried tomatoes and bell pepper on spinach fettuccine." },
    { name: "Tarragon Chicken", category: "Mains", price: 2195, description: "Grilled chicken with tarragon sauce, vegetables and buttered rice." },
    { name: "Grilled Moroccan Chicken", category: "Mains", price: 1895, description: "Moroccan sauce with parsley, cilantro, cumin and paprika on grilled chicken with buttered rice." },
    { name: "Vol-Au-Vent", category: "Mains", price: 1995, description: "French delicacy with creamy mushroom sauce, tender chicken and flaky puff pastry." },
    { name: "Jalapeno Chicken", category: "Mains", price: 1895, description: "Creamy jalapeno sauce on grilled chicken fillet with buttered rice." },
    { name: "Beef Stroganoff", category: "Mains", price: 2295, description: "Thinly sliced beef fillet in sour cream and mushroom sauce with butter rice." },
    { name: "Surf & Turf", category: "Mains", price: 3495, description: "Prawns and beef with bone marrow, vegetables and creamy mashed potatoes." },
    { name: "Mexican Tenderloin Fillets", category: "Mains", price: 3495, description: "Tenderloin fillet with fiery Mexican red sauce, capsicum, jalapeno and sweet corn." },
    { name: "Beef Medallion", category: "Mains", price: 3495, description: "Thick tenderloin fillet with brown mushroom sauce, spinach, mac & cheese and vegetables." },
    { name: "Brisket", category: "Smoked House", price: 4995, description: "14-hour oakwood-smoked brisket. From." },
    { name: "Short Ribs", category: "Smoked House", price: 4495, description: "Oakwood-smoked short ribs. From." },
    { name: "Smoked Chicken Full Bird", category: "Smoked House", price: 3995, description: "Oakwood-smoked whole chicken. From." },
    { name: "Fried Calamari", category: "Seafood", price: 1295, description: "Crispy fried calamari rings." },
    { name: "Dynamite Prawns", category: "Seafood", price: 1495, description: "Spicy dynamite prawns." },
    { name: "Fusion Garlic Prawns", category: "Seafood", price: 1595, description: "Garlic prawns with fusion sauce." },
    { name: "Lobster Thermidor", category: "Seafood", price: 7495, description: "Classic lobster thermidor." },
    { name: "Pink Salmon with Blackcurrant Sauce", category: "Seafood", price: 4995, description: "Grilled salmon with blackcurrant sauce." },
    { name: "Samke Harra Fish", category: "Seafood", price: 2395, description: "Middle Eastern spiced fish." },
    { name: "Grilled Jumbo Prawns", category: "Seafood", price: 2995, description: "Grilled jumbo prawns." },
    { name: "Sole Mediterranean", category: "Seafood", price: 2395, description: "Mediterranean-style sole fillet." },
    { name: "Fettuccine Alfredo", category: "Pasta", price: 1395, description: "Creamy alfredo fettuccine." },
    { name: "Marinara Pasta", category: "Pasta", price: 1495, description: "Classic marinara pasta." },
    { name: "Chicken Lasagna", category: "Pasta", price: 1595, description: "Layered chicken lasagna." },
    { name: "Beef Lasagna", category: "Pasta", price: 1695, description: "Layered beef lasagna." },
    { name: "Chicken Nachos", category: "Sides", price: 1095, description: "Loaded chicken nachos." },
    { name: "Hummus", category: "Sides", price: 1195, description: "Traditional hummus with bread." },
    { name: "Almonds Crusted Chicken Strips", category: "Sides", price: 1435, description: "Crunchy almond-crusted chicken strips." },
    { name: "Beef Brisket Crostini", category: "Sides", price: 1495, description: "Smoked brisket crostini." },
    { name: "Chicken Caesar Salad", category: "Salads", price: 1495, description: "Classic Caesar with grilled chicken." },
    { name: "Quinoa Salad", category: "Salads", price: 1495, description: "Healthy quinoa salad." },
    { name: "Smoked Wings", category: "Wings", price: 1495, description: "Oakwood-smoked wings. From." },
    { name: "Tacos", category: "Wraps", price: 1495, description: "Gauchos special tacos." },
  ],
};
