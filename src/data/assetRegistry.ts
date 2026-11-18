/**
 * SafeHome3D AI - Asset Registry
 * Central catalog of photorealistic 3D assets conforming to the isometric dollhouse design.
 */

export interface MaterialVariant {
  id: string;
  name: string;
  colorHex?: string;
  diffuseMap?: string;
  roughnessMap?: string;
  normalMap?: string;
  roughness: number;
  metalness: number;
}

export interface AssetRegistryEntry {
  id: string;
  name: string;
  category: "BEDROOM" | "WARDROBE" | "BATHROOM" | "DECORATION" | "ARCHITECTURE" | "SAFETY";
  glbPath: string;
  nominalDimensions: {
    width: number;
    length: number;
    height: number;
  };
  originPivot: "BOTTOM_CENTER" | "CENTER" | "BOTTOM_BACK";
  materialVariants: MaterialVariant[];
  license: "CC0" | "PolyHaven CC0" | "SafeHome Custom 3D";
  fileSizeBytes: number;
  lodAvailable: boolean;
  description: string;
}

export const ASSET_REGISTRY: Record<string, AssetRegistryEntry> = {
  double_bed_photoreal: {
    id: "double_bed_photoreal",
    name: "Giường đôi Scandinavian bọc nệm (Master Bed)",
    category: "BEDROOM",
    glbPath: "/models/bedroom/double_bed_photoreal.glb",
    nominalDimensions: { width: 2.0, length: 2.12, height: 1.0 },
    originPivot: "BOTTOM_CENTER",
    materialVariants: [
      {
        id: "natural_oak_linen",
        name: "Gỗ sồi sáng & Vải Linen kem",
        colorHex: "#f5f2ea",
        diffuseMap: "/textures/fabrics/rough_linen_diffuse_1k.jpg",
        roughnessMap: "/textures/fabrics/rough_linen_rough_1k.jpg",
        normalMap: "/textures/fabrics/rough_linen_nor_gl_1k.jpg",
        roughness: 0.85,
        metalness: 0.05,
      },
      {
        id: "walnut_charcoal",
        name: "Gỗ óc chó & Vải nỉ xám",
        colorHex: "#e2e8f0",
        roughness: 0.9,
        metalness: 0.05,
      },
    ],
    license: "SafeHome Custom 3D",
    fileSizeBytes: 13312,
    lodAvailable: true,
    description: "Giường đôi cao cấp với khung gỗ sồi, đầu giường bọc nệm, chăn phủ nếp gấp và 4 gối ngủ theo phong cách ảnh tham chiếu.",
  },

  bedside_table_lamp: {
    id: "bedside_table_lamp",
    name: "Tủ đầu giường gỗ sồi kèm đèn ngủ cao cấp",
    category: "BEDROOM",
    glbPath: "/models/bedroom/bedside_table_lamp.glb",
    nominalDimensions: { width: 0.52, length: 0.44, height: 0.82 },
    originPivot: "BOTTOM_CENTER",
    materialVariants: [
      {
        id: "light_oak_white_shade",
        name: "Gỗ sồi & Chao đèn kem ấm",
        colorHex: "#d2b48e",
        roughness: 0.55,
        metalness: 0.1,
      },
    ],
    license: "SafeHome Custom 3D",
    fileSizeBytes: 11988,
    lodAvailable: true,
    description: "Tủ đầu giường 2 ngăn kéo gỗ sồi sáng kèm đèn bàn ánh sáng ấm và sách đọc trang trí.",
  },

  side_table: {
    id: "side_table",
    name: "Bàn góc đầu giường tròn phong cách Bắc Âu",
    category: "BEDROOM",
    glbPath: "/models/bedroom/side_table.glb",
    nominalDimensions: { width: 0.5, length: 0.5, height: 0.55 },
    originPivot: "BOTTOM_CENTER",
    materialVariants: [
      {
        id: "oak_minimalist",
        name: "Gỗ sồi thanh mảnh",
        roughness: 0.6,
        metalness: 0.05,
      },
    ],
    license: "SafeHome Custom 3D",
    fileSizeBytes: 445856,
    lodAvailable: true,
    description: "Bàn góc tròn chân gỗ sồi chắc chắn để đèn hoặc ly nước cạnh giường ngủ.",
  },

  walkin_closet_system: {
    id: "walkin_closet_system",
    name: "Hệ tủ quần áo mở Walk-in Closet",
    category: "WARDROBE",
    glbPath: "/models/wardrobe/walkin_closet_system.glb",
    nominalDimensions: { width: 2.45, length: 0.55, height: 2.35 },
    originPivot: "BOTTOM_CENTER",
    materialVariants: [
      {
        id: "scandi_oak_modular",
        name: "Gỗ sồi Scandinavian & Thanh treo chrome",
        colorHex: "#d2b48e",
        roughness: 0.5,
        metalness: 0.15,
      },
    ],
    license: "SafeHome Custom 3D",
    fileSizeBytes: 43212,
    lodAvailable: true,
    description: "Hệ tủ quần áo mở phong cách Walk-in closet gồm nhiều tầng ngăn kéo, giỏ đựng, thanh treo và các bộ quần áo móc treo đa dạng màu sắc.",
  },

  drawer_cabinet: {
    id: "drawer_cabinet",
    name: "Tủ ngăn kéo phụ kiện Walk-in",
    category: "WARDROBE",
    glbPath: "/models/wardrobe/drawer_cabinet.glb",
    nominalDimensions: { width: 0.9, length: 0.5, height: 0.9 },
    originPivot: "BOTTOM_CENTER",
    materialVariants: [
      {
        id: "polyhaven_oak",
        name: "Gỗ sồi vân mịn",
        roughness: 0.6,
        metalness: 0.1,
      },
    ],
    license: "PolyHaven CC0",
    fileSizeBytes: 1251784,
    lodAvailable: true,
    description: "Tủ ngăn kéo thấp 3 tầng để phụ kiện, đồng hồ và khăn tắm trong phòng thay đồ.",
  },

  toilet_modern: {
    id: "toilet_modern",
    name: "Bồn cầu sứ trắng nguyên khối xả kép",
    category: "BATHROOM",
    glbPath: "/models/bathroom/toilet_modern.glb",
    nominalDimensions: { width: 0.44, length: 0.68, height: 0.86 },
    originPivot: "BOTTOM_CENTER",
    materialVariants: [
      {
        id: "white_gloss_porcelain",
        name: "Sứ phủ men bóng Nano",
        colorHex: "#fcfcff",
        roughness: 0.12,
        metalness: 0.05,
      },
    ],
    license: "SafeHome Custom 3D",
    fileSizeBytes: 12185,
    lodAvailable: true,
    description: "Bồn cầu sứ cao cấp kiểu dáng công thái học hiện đại với nắp êm, két nước xả kép và phím nhấn kim loại chrome.",
  },

  bathroom_vanity: {
    id: "bathroom_vanity",
    name: "Tủ chậu Lavabo treo tường & Gương LED",
    category: "BATHROOM",
    glbPath: "/models/bathroom/bathroom_vanity.glb",
    nominalDimensions: { width: 1.22, length: 0.54, height: 1.95 },
    originPivot: "BOTTOM_CENTER",
    materialVariants: [
      {
        id: "oak_white_composite",
        name: "Gỗ sồi & Mặt đá sứ trắng",
        colorHex: "#ffffff",
        roughness: 0.2,
        metalness: 0.1,
      },
    ],
    license: "SafeHome Custom 3D",
    fileSizeBytes: 18124,
    lodAvailable: true,
    description: "Bộ bàn chậu rửa tay cao cấp kèm gương soi khổ lớn có đèn LED hắt sáng, vòi nước kim loại chrome và bình rửa tay.",
  },

  shower_enclosure: {
    id: "shower_enclosure",
    name: "Cabin tắm đứng vách kính & Cây sen phun mưa",
    category: "BATHROOM",
    glbPath: "/models/bathroom/shower_enclosure.glb",
    nominalDimensions: { width: 1.2, length: 1.0, height: 2.1 },
    originPivot: "BOTTOM_CENTER",
    materialVariants: [
      {
        id: "clear_tempered_chrome",
        name: "Kính cường lực trong suốt & Phụ kiện Chrome",
        colorHex: "#ffffff",
        roughness: 0.05,
        metalness: 0.95,
      },
    ],
    license: "SafeHome Custom 3D",
    fileSizeBytes: 14233,
    lodAvailable: true,
    description: "Khu vực tắm đứng hiện đại với vách kính cường lực trong suốt, đế thu nước thanh thoát và hệ thống vòi sen cây chrome cao cấp.",
  },

  potted_plant: {
    id: "potted_plant",
    name: "Chậu cây xanh trang trí thanh lọc không khí",
    category: "DECORATION",
    glbPath: "/models/decoration/potted_plant.glb",
    nominalDimensions: { width: 0.65, length: 0.65, height: 1.15 },
    originPivot: "BOTTOM_CENTER",
    materialVariants: [
      {
        id: "ceramic_green_foliage",
        name: "Chậu gốm trắng & Tán lá tự nhiên",
        roughness: 0.4,
        metalness: 0.0,
      },
    ],
    license: "PolyHaven CC0",
    fileSizeBytes: 6603392,
    lodAvailable: true,
    description: "Chậu cây cảnh nội thất tán lá xanh mềm mại đặt cạnh cửa sổ đón ánh nắng tự nhiên.",
  },

  framed_wall_art: {
    id: "framed_wall_art",
    name: "Bộ đôi tranh nghệ thuật tối giản đóng khung",
    category: "DECORATION",
    glbPath: "/models/decoration/framed_wall_art.glb",
    nominalDimensions: { width: 0.95, length: 0.03, height: 0.72 },
    originPivot: "BOTTOM_CENTER",
    materialVariants: [
      {
        id: "natural_wood_print",
        name: "Khung gỗ sồi tự nhiên & Tranh Minimalist",
        colorHex: "#f0ece1",
        roughness: 0.6,
        metalness: 0.0,
      },
    ],
    license: "SafeHome Custom 3D",
    fileSizeBytes: 4608,
    lodAvailable: false,
    description: "Bộ hai bức tranh trừu tượng treo tường đầu giường ngủ với viền khung gỗ ấm cúng theo bố cục ảnh tham chiếu.",
  },

  modern_window: {
    id: "modern_window",
    name: "Cửa sổ kính đôi lớn hướng nắng tự nhiên",
    category: "ARCHITECTURE",
    glbPath: "/models/architecture/modern_window.glb",
    nominalDimensions: { width: 1.8, length: 0.18, height: 1.9 },
    originPivot: "BOTTOM_CENTER",
    materialVariants: [
      {
        id: "anthracite_aluminum",
        name: "Nhôm sơn tĩnh điện xám than & Kính trong",
        colorHex: "#2d3034",
        roughness: 0.25,
        metalness: 0.8,
      },
    ],
    license: "SafeHome Custom 3D",
    fileSizeBytes: 7225,
    lodAvailable: false,
    description: "Cửa sổ kiến trúc khổ lớn chia ô đón luồng ánh sáng ấm tự nhiên vào phòng ngủ.",
  },

  safety_grab_bar: {
    id: "safety_grab_bar",
    name: "Thanh tay vịn an toàn Inox 304 trợ lực cao cấp",
    category: "SAFETY",
    glbPath: "/models/safety/safety_grab_bar.glb",
    nominalDimensions: { width: 0.6, length: 0.1, height: 0.1 },
    originPivot: "BOTTOM_CENTER",
    materialVariants: [
      {
        id: "brushed_stainless_steel",
        name: "Inox 304 xước mờ chống trơn trượt",
        colorHex: "#e5e7eb",
        roughness: 0.2,
        metalness: 0.92,
      },
    ],
    license: "SafeHome Custom 3D",
    fileSizeBytes: 8089,
    lodAvailable: false,
    description: "Thanh tay vịn tiêu chuẩn y tế gắn tường cạnh bồn cầu và phòng tắm đứng giúp người cao tuổi chống ngã.",
  },
};
