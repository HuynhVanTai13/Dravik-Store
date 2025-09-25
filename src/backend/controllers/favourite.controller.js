import Favourite from "../models/Favourite.js";

// Lấy danh sách sản phẩm yêu thích theo user (có ảnh)
export const getUserFavourites = async (req, res) => {
  try {
    const { userId } = req.params;

    // Populate đầy đủ product để có name/price/discount/slug/variants.image/mainImage
    const favourites = await Favourite
      .find({ users_id: userId })
      .populate({ path: "products_id" });

    // Trả về mảng product
    const products = favourites.map((fav) => fav.products_id);
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: "Lỗi khi lấy danh sách yêu thích", error: err.message });
  }
};

// Thêm sản phẩm vào danh sách yêu thích
export const addFavourite = async (req, res) => {
  try {
    const { users_id, products_id } = req.body;

    const exists = await Favourite.findOne({ users_id, products_id });
    if (exists) {
      return res.status(400).json({ message: "Sản phẩm đã có trong danh sách yêu thích" });
    }

    const fav = new Favourite({ users_id, products_id });
    await fav.save();

    res.status(201).json({ message: "Đã thêm vào yêu thích", favourite: fav });
  } catch (err) {
    res.status(500).json({ message: "Lỗi thêm yêu thích", error: err.message });
  }
};

// Xoá sản phẩm khỏi yêu thích
export const deleteFavourite = async (req, res) => {
  try {
    const { userId, productId } = req.params;

    const deleted = await Favourite.findOneAndDelete({
      users_id: userId,
      products_id: productId,
    });

    if (!deleted) {
      return res.status(404).json({ message: "Không tìm thấy sản phẩm yêu thích" });
    }

    res.json({ message: "Đã xoá khỏi yêu thích" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi xoá yêu thích", error: err.message });
  }
};
