// ============================================================
// ELECTRONICS AI
// PRODUCT IMAGE MAPPING
// ============================================================
//
// product_id -> image path
//
// All image paths point to:
// Frontend/public/images/
//
// IMPORTANT:
// 1. Database contains products 1 - 64.
// 2. Each product_id has its own image path.
// 3. Images are stored locally in the frontend.
// 4. No image_url column is required in PostgreSQL.
// 5. Do NOT use another product's image as a fallback.
// 6. File names must exactly match the files inside
//    Frontend/public/images/.
//
// ============================================================

const productImages = {
  // ==========================================================
  // 1 - 5 : LAPTOPS
  // ==========================================================

  1: "/images/LAPTOPS/dell-inspiron.jpg",

  2: "/images/LAPTOPS/MacBook-Air-M3.jpg",

  3: "/images/LAPTOPS/ThinkPad-E14.jpg",

  4: "/images/LAPTOPS/hp-pavilion.jpg",

  5: "/images/LAPTOPS/ROG-Strix-G16.jpg",

  // ==========================================================
  // 6 - 10 : MOBILES
  // ==========================================================

  6: "/images/MOBILES/iPhone-15.jpg",

  7: "/images/MOBILES/samsung-s24.jpg",

  8: "/images/MOBILES/OnePlus-13.jpg",

  9: "/images/MOBILES/Pixel-9.jpg",

  10: "/images/MOBILES/Nothing-Phone.jpg",

  // ==========================================================
  // 11 - 15 : TABLETS
  // ==========================================================

  11: "/images/TABLETS/ipad-air-M2.jpg",

  12: "/images/TABLETS/Galaxy-Tab-S9.jpg",

  13: "/images/TABLETS/OnePlus-Pad-2.jpg",

  14: "/images/TABLETS/Lenovo-Tab-P12.jpg",

  15: "/images/MOBILES/iPad-10th-Gen.jpg",

  // ==========================================================
  // 16 - 20 : DESKTOPS
  // ==========================================================

  16: "/images/LAPTOPS/Inspiron-Desktop.jpg",

  17: "/images/LAPTOPS/Mac-Mini-M4.jpg",

  18: "/images/LAPTOPS/IdeaCentre-5.jpg",

  19: "/images/LAPTOPS/HP-Pro-Tower.jpg",

  20: "/images/LAPTOPS/ROG-G22.jpg",

  // ==========================================================
  // 21 - 25 : MONITORS
  // ==========================================================

  21: "/images/MONITORS/UltraSharp-27.jpg",

  22: "/images/MONITORS/LG-UltraGear-27.jpg",

  23: "/images/MONITORS/Samsung-Smart-Monitor.jpg",

  24: "/images/MONITORS/BenQ-GW2780.jpg",

  25: "/images/MONITORS/ASUS-ProArt-27.jpg",

  // ==========================================================
  // 26 - 30 : ACCESSORIES
  // ==========================================================

  26: "/images/ACCESSORIES/Wireless-Mouse.jpg",

  27: "/images/ACCESSORIES/Mechanical-Keyboard-K2.jpg",

  28: "/images/ACCESSORIES/WH-1000XM5.jpg",

  29: "/images/ACCESSORIES/True Wireless.jpg",

  30: "/images/ACCESSORIES/65W-USB-C-Charger.jpg",

  // ==========================================================
  // 31 - 33 : AIR CONDITIONERS
  // ==========================================================

  31: "/images/HOME%20APPLIANCES/lg-ac-1.jpg",

  32: "/images/ACCESSORIES/AC-stabilizer.jpg",

  33: "/images/ACCESSORIES/AC%20Installation%20Kit.jpg",

  // ==========================================================
  // 34 - 35 : REFRIGERATORS
  // ==========================================================

  34: "/images/HOME%20APPLIANCES/samsung-refrigerator.jpg",

  35: "/images/ACCESSORIES/Refrigerator-Stabilizer.jpg",

  // ==========================================================
  // 36 - 37 : WASHING MACHINES
  // ==========================================================

  36: "/images/HOME%20APPLIANCES/lg-washing-machine-front-door.jpg",

  37: "/images/ACCESSORIES/Washing-Machine-Stand.jpg",

  // ==========================================================
  // 38 - 40 : TV / TV ACCESSORIES
  // ==========================================================

  38: "/images/TV/sony-tv-1.jpg",

  39: "/images/ACCESSORIES/5.1-Channel-Soundbar.jpg",

  40: "/images/ACCESSORIES/Premium%20HDMI%20Cable.jpg",

  // ==========================================================
  // 41 - 44 : LAPTOP / LAPTOP ACCESSORIES
  // ==========================================================

  41: "/images/LAPTOPS/15.6%20Inch%20Performance%20Laptop.jpg",

  42: "/images/ACCESSORIES/Wireless-Mouse.jpg",

  43: "/images/ACCESSORIES/laptop-backpack.jpg",

  44: "/images/ACCESSORIES/laptop-cooling-pad.jpg",

  // ==========================================================
  // 45 - 46 : HEADPHONES / EARBUDS
  // ==========================================================

  45: "/images/ACCESSORIES/WH-1000XM5.jpg",

  46: "/images/ACCESSORIES/wireless-airpods.jpg",

  // ==========================================================
  // 47 : MICROWAVE
  // ==========================================================

  47: "/images/HOME%20APPLIANCES/Microwave-Oven.jpg",

  // ==========================================================
  // 48 : AIR FRYER
  // ==========================================================

  48: "/images/HOME%20APPLIANCES/Digital-Air-Fryer.jpg",

  // ==========================================================
  // 49 : VACUUM CLEANER
  // ==========================================================

  49: "/images/HOME%20APPLIANCES/vaccum_cleaner.jpg",

  // ==========================================================
  // 50 : AIR PURIFIER
  // ==========================================================

  50: "/images/HOME%20APPLIANCES/air-purifier.jpg",

  // ==========================================================
  // 51 - 57 : ADDITIONAL MOBILES
  // ==========================================================

  51: "/images/MOBILES/iphone-17-pro.jpg",

  52: "/images/MOBILES/vivo-x300.jpg",

  53: "/images/MOBILES/realme-11-pro.jpg",

  54: "/images/MOBILES/iqoo-13-pro.jpg",

  55: "/images/MOBILES/iphone-16.jpg",

  56: "/images/MOBILES/samsung-s25.jpg",

  57: "/images/MOBILES/oneplus-14.jpg",

  // ==========================================================
  // 58 - 64 : WATCHES
  // ==========================================================

  58: "/images/WATCHES/smart-watch-1.jpg",

  59: "/images/WATCHES/boat-smart-watch.jpg",

  60: "/images/WATCHES/noise-smart-watch.jpg",

  61: "/images/WATCHES/I-watch.jpg",

  62: "/images/WATCHES/Rolex-watch.jpg",

  63: "/images/WATCHES/fossil-watch.jpg",

  64: "/images/WATCHES/titan-watch.jpg",
};

// ============================================================
// EXPORT
// ============================================================

export default productImages;
