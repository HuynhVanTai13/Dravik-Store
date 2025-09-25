import mongoose from 'mongoose';
import Product from '../models/Product.js';
import parseVariantsFromBody from '../utils/parseVariants.js';
import Category from '../models/Category.js';
import Brand from '../models/Brand.js';
import Color from '../models/Color.js';
import Size from '../models/Size.js';
import slugify from 'slugify';
import fs from 'fs';

// ✅ Hàm lọc các biến thể và size đang hoạt động
function filterActiveVariants(variants) {
    return variants
        .filter(variant => variant.isActive)
        .map(variant => ({
            ...variant,
            sizes: variant.sizes.filter(size => size.isActive),
        }));
}

// ✅ Hàm kiểm tra còn lại <= threshold (mặc định 5)
function checkLowStock(variants, threshold = 5) {
    for (const variant of variants) {
        for (const size of variant.sizes) {
            if ((size.quantity - size.sold) <= threshold) {
                return true;
            }
        }
    }
    return false;
}

// ✅ Tính tổng đã bán của 1 product (không dùng optional chaining)
const calcTotalSold = (p) => {
    try {
        return (p.variants || []).reduce((sum, v) => {
            const sizes = v.sizes || [];
            const soldInVariant = sizes.reduce((s, sz) => {
                const sold = sz && sz.sold != null ? Number(sz.sold) : 0;
                return s + sold;
            }, 0);
            return sum + soldInVariant;
        }, 0);
    } catch (e) {
        return 0;
    }
};


// ✅ API lấy danh sách sản phẩm
export const getAllProducts = async(req, res) => {
    try {
        const {
            page = 1, limit = 10, search = '',
                minPrice, maxPrice, category, brand,
                showHidden = 'false', isActive, status,
                sort = 'featured'
        } = req.query;

        // limit/page
        const MAX_LIMIT = 100000;
        const isAll = String(limit).toLowerCase() === 'all';
        const limitNum = isAll ? MAX_LIMIT : Math.max(1, Number(limit) || 10);
        const pageNum = Math.max(1, Number(page) || 1);
        const skip = isAll ? 0 : (pageNum - 1) * limitNum;

        // build query
        const query = { name: { $regex: (search || '').trim(), $options: 'i' } };

        if (showHidden !== 'true') query.isActive = true;

        if (status === 'active') query.isActive = true;
        else if (status === 'inactive') query.isActive = false;
        else {
            if (isActive === 'true') query.isActive = true;
            else if (isActive === 'false') query.isActive = false;
        }

        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = Number(minPrice);
            if (maxPrice) query.price.$lte = Number(maxPrice);
        }

        if (category) {
            const categoryNames = category.split(',');
            const categoryDocs = await Category.find({
                $or: [
                    { name: { $in: categoryNames } },
                    { slug: { $in: categoryNames } },
                    { _id: { $in: categoryNames.filter(id => mongoose.isValidObjectId(id)) } },
                ],
            }).select('_id');
            query.category = { $in: categoryDocs.map(c => c._id) };
        }

        if (brand) {
            const brandKeys = brand.split(',');
            const brandDocs = await Brand.find({
                $or: [
                    { name: { $in: brandKeys } },
                    { slug: { $in: brandKeys } },
                    { _id: { $in: brandKeys.filter(id => mongoose.isValidObjectId(id)) } },
                ],
            }).select('_id');
            query.brand = { $in: brandDocs.map(b => b._id) };
        }

        // sort map (mặc định)
        let sortObj = { createdAt: -1 }; // featured
        if (sort === 'sold') sortObj = { 'variants.sizes.sold': -1 }; // tạm (đường cũ)
        if (sort === 'discount') sortObj = { discount: -1 };
        if (sort === 'new') sortObj = { createdAt: -1 };
        if (sort === 'price_asc') sortObj = { price: 1 };
        if (sort === 'price_desc') sortObj = { price: -1 };

        /* ----------------- ✅ Trường hợp sort=“sold” chuẩn bằng tổng sold ----------------- */
        if (String(sort) === 'sold') {
            // Dùng aggregate để tính totalSold và sort đúng
            const pipeline = [
                { $match: query },
                {
                    $addFields: {
                        totalSold: {
                            $sum: {
                                $map: {
                                    input: { $ifNull: ['$variants', []] },
                                    as: 'v',
                                    in: {
                                        $sum: {
                                            $map: {
                                                input: { $ifNull: ['$$v.sizes', []] },
                                                as: 's',
                                                in: { $ifNull: ['$$s.sold', 0] }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                { $sort: { totalSold: -1, _id: 1 } },
                ...(isAll ? [] : [{ $skip: skip }, { $limit: limitNum }]),
            ];

            let agg = await Product.aggregate(pipeline);
            // populate category, brand, variants.color
            agg = await Product.populate(agg, [{ path: 'category' }, { path: 'brand' }, { path: 'variants.color' }]);
            agg = await Product.populate(agg, [{ path: 'variants.sizes.size', model: 'Size' }]);

            const filtered = agg.map((product) => {
                const productObj = typeof product.toObject === 'function' ? product.toObject() : product;
                let variants = productObj.variants || [];
                if (showHidden !== 'true') variants = filterActiveVariants(variants);
                const isLowStock = checkLowStock(variants, 20);
                return {...productObj, variants, isLowStock };
            });

            const total = await Product.countDocuments(query);
            return res.status(200).json({
                items: filtered,
                total,
                page: pageNum,
                limit: isAll ? 'all' : limitNum
            });
        }
        /* ------------------------------------------------------------------------------ */

        // SINGLE QUERY (các sort khác)
        let products = await Product.find(query)
            .populate('category')
            .populate('brand')
            .populate('variants.color')
            .sort(sortObj)
            .skip(skip)
            .limit(limitNum);

        // populate size
        products = await Product.populate(products, {
            path: 'variants.sizes.size',
            model: 'Size',
        });

        // filter biến thể/size theo showHidden
        const filteredProducts = products.map(product => {
            const productObj = product.toObject();
            let variants = productObj.variants;
            if (showHidden !== 'true') {
                variants = filterActiveVariants(variants);
            }
            const isLowStock = checkLowStock(variants, 20);
            return {...productObj, variants, isLowStock };
        });

        const total = await Product.countDocuments(query);

        return res.status(200).json({
            items: filteredProducts,
            total,
            page: pageNum,
            limit: isAll ? 'all' : limitNum
        });
    } catch (error) {
        console.error('❌ Lỗi khi lấy danh sách sản phẩm:', error);
        res.status(500).json({ message: 'Lỗi server khi lấy sản phẩm' });
    }
};

// GET BY SLUG
export const getProductBySlug = async(req, res) => {
    try {
        let product = await Product.findOne({ slug: req.params.slug, isActive: true })
            .populate('category')
            .populate('brand')
            .populate('variants.color');

        if (!product) {
            return res.status(404).json({ message: 'Không tìm thấy sản phẩm theo slug' });
        }

        product = await Product.populate(product, {
            path: 'variants.sizes.size',
            model: 'Size',
        });

        // ✅ Lọc variant và size active
        const filteredVariants = product.variants
            .filter((variant) => variant.isActive)
            .map((variant) => ({
                ...variant.toObject(),
                sizes: variant.sizes.filter((size) => size.isActive),
            }));

        const finalProduct = {
            ...product.toObject(),
            variants: filteredVariants,
        };

        res.status(200).json(finalProduct);
    } catch (err) {
        console.error('❌ Lỗi lấy sản phẩm theo slug:', err);
        res.status(500).json({
            message: 'Lỗi server khi lấy sản phẩm theo slug',
            error: err.message,
            stack: err.stack,
        });
    }
};

// GET BY ID
export const getProductById = async(req, res) => {
    try {
        let product = await Product.findById(req.params.id)
            .populate('category')
            .populate('brand')
            .populate('variants.color');

        if (!product) {
            return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
        }

        // ✅ Populate sâu cho size
        product = await Product.populate(product, {
            path: 'variants.sizes.size',
            model: 'Size',
        });

        // ✅ Không lọc gì cả → trả về đầy đủ để admin sửa
        res.status(200).json(product);
    } catch (err) {
        console.error('❌ Lỗi khi lấy sản phẩm theo ID:', err);
        res.status(500).json({
            message: 'Lỗi server khi lấy chi tiết sản phẩm',
            error: err.message,
        });
    }
};

// CREATE PRODUCT
export const createProduct = async(req, res) => {
    try {
        const { name, price, discount, description, category, brand, isActive } = req.body
        const slug = slugify(name, { lower: true, strict: true })

        const variants = parseVariantsFromBody(req.body, req.files)

        if (!variants.length) {
            return res.status(400).json({ message: 'Chưa có biến thể hợp lệ!' })
        }

        const product = new Product({
            name,
            slug,
            price,
            discount,
            description,
            category,
            brand,
            isActive: isActive === 'true',
            variants
        })

        await product.save()
        res.status(201).json({ message: 'Thêm sản phẩm thành công', product })
    } catch (err) {
        console.error('❌ Lỗi tạo sản phẩm:', err)
        res.status(500).json({ message: 'Lỗi server khi tạo sản phẩm', error: err.message })
    }
}

export const updateProduct = async(req, res) => {
    try {
        const { id } = req.params
        const { name, price, discount, description, category, brand, isActive } = req.body
        const slug = slugify(name, { lower: true, strict: true })
        let product = await Product.findById(id)
        if (!product) return res.status(404).json({ message: 'Product not found' })
        const newVariants = parseVariantsFromBody(req.body, req.files)
        const updatedVariants = newVariants.map((variant, index) => {
            // Tìm đúng oldVariant theo ID màu (color._id), không dùng theo index
            const old = product.variants.find(v => String(v.color) === String(variant.color)) || {};

            return {
                color: variant.color,
                image: variant.image || old.image || null,
                isActive: typeof variant.isActive !== 'undefined' ?
                    variant.isActive :
                    (typeof old.isActive !== 'undefined' ? old.isActive : true),

                sizes: variant.sizes.map((s) => {
                    const oldSize = (old.sizes || []).find(os => String(os.size) === String(s.size)) || {};

                    return {
                        size: s.size,
                        quantity: Number(s.quantity),
                        sold: Number(s.sold),
                        isActive: typeof s.isActive !== 'undefined' ?
                            s.isActive :
                            (typeof oldSize.isActive !== 'undefined' ? oldSize.isActive : true)
                    };
                })
            };
        });

        product.name = name
        product.slug = slug
        product.price = price
        product.discount = discount
        product.description = description
        product.category = category
        product.brand = brand
        product.isActive = isActive === 'true'
        product.variants = updatedVariants

        // Nếu trạng thái sản phẩm là ẩn thì ẩn toàn bộ biến thể và size
        if (!product.isActive) {
            product.variants = product.variants.map(v => ({
                ...v,
                isActive: false,
                sizes: v.sizes.map(s => ({...s, isActive: false })),
            }));
        }

        await product.save()
        res.status(200).json({ message: 'Product updated successfully' })
    } catch (err) {
        console.error('Update product error:', err)
        res.status(500).json({ message: 'Server error' })
    }
}

// PATCH: Cập nhật trạng thái sản phẩm kèm đồng bộ màu và size khi ẩn
export const updateProductStatus = async(req, res) => {
    try {
        const { id } = req.params;
        const { isActive } = req.body;
        const activeValue = isActive === 'true' || isActive === true;

        const product = await Product.findById(id);
        if (!product) return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });

        product.isActive = activeValue;

        if (!activeValue) {
            // Nếu ẩn thì ẩn hết tất cả màu và size
            product.variants = product.variants.map(variant => ({
                ...variant,
                isActive: false,
                sizes: variant.sizes.map(s => ({...s, isActive: false }))
            }));
        } else {
            // Nếu bật thì chỉ bật sản phẩm, giữ nguyên trạng thái cũ của màu và size
            // Tức là KHÔNG thay đổi gì trong variants ở đây
        }

        await product.save();
        res.status(200).json({
            message: 'Cập nhật trạng thái sản phẩm thành công',
            product,
        });
    } catch (err) {
        console.error('Lỗi cập nhật trạng thái sản phẩm:', err);
        res.status(500).json({ message: 'Lỗi server khi cập nhật trạng thái sản phẩm', error: err.message });
    }
};

export const updateVariantStatus = async(req, res) => {
    try {
        const { productId, variantIndex } = req.params;
        const { isActive } = req.body;
        const activeValue = isActive === 'true' || isActive === true;

        const product = await Product.findById(productId);
        if (!product || !product.variants[variantIndex]) {
            return res.status(404).json({ message: 'Không tìm thấy màu trong sản phẩm' });
        }

        // Nếu sản phẩm đang ẩn thì không cho thay đổi
        if (!product.isActive) {
            return res.status(400).json({ message: 'Không thể thay đổi trạng thái màu khi sản phẩm đang bị ẩn' });
        }

        product.variants[variantIndex].isActive = activeValue;

        // Nếu màu bị ẩn thì ẩn toàn bộ size trong màu đó
        if (!activeValue) {
            product.variants[variantIndex].sizes = product.variants[variantIndex].sizes.map(s => ({
                ...s,
                isActive: false
            }));
        }

        // Nếu bật màu → bật toàn bộ size theo
        if (activeValue) {
            product.variants[variantIndex].sizes = product.variants[variantIndex].sizes.map(s => ({
                ...s,
                isActive: true
            }));
        }

        await product.save();
        res.status(200).json({ message: 'Cập nhật trạng thái màu thành công', product });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server khi cập nhật trạng thái màu' });
    }
};

export const updateSizeStatus = async(req, res) => {
    try {
        const { productId, variantIndex, sizeIndex } = req.params;
        const { isActive } = req.body;
        const activeValue = isActive === 'true' || isActive === true;

        const product = await Product.findById(productId);
        if (!product || !product.variants[variantIndex]) {
            return res.status(404).json({ message: 'Không tìm thấy màu trong sản phẩm' });
        }

        const variant = product.variants[variantIndex];

        if (!variant.sizes[sizeIndex]) {
            return res.status(404).json({ message: 'Không tìm thấy size trong màu' });
        }

        // Nếu sản phẩm hoặc màu đang ẩn thì không cho bật size
        if (!product.isActive || !variant.isActive) {
            return res.status(400).json({
                message: 'Không thể thay đổi trạng thái size khi sản phẩm hoặc màu đang bị ẩn',
            });
        }

        variant.sizes[sizeIndex].isActive = activeValue;

        await product.save();
        res.status(200).json({ message: 'Cập nhật trạng thái size thành công', product });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server khi cập nhật trạng thái size' });
    }
};

// DELETE
export const deleteProduct = async(req, res) => {
    try {
        const { id } = req.params;
        const deleted = await Product.findByIdAndDelete(id);
        if (!deleted) return res.status(404).json({ message: 'Không tìm thấy sản phẩm để xóa' });

        res.status(200).json({ message: 'Xóa sản phẩm thành công' });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi khi xóa sản phẩm' });
    }
};

export const applyPurchase = async(req, res) => {
    try {
        const body = req.body || {};
        const items = Array.isArray(body.items) ? body.items : [];
        if (!items.length) {
            return res.status(400).json({ message: 'Danh sách items rỗng' });
        }

        // gom các productId đã đụng tới để kiểm tra lại tồn sau khi cập nhật
        const touched = new Set();

        for (let i = 0; i < items.length; i++) {
            const it = items[i] || {};

            const productId = String(it.productId || '');
            const colorId = String(it.colorId || '');
            const sizeId = String(it.sizeId || '');
            const qtyVal = (it.qty !== undefined && it.qty !== null) ?
                it.qty :
                ((it.quantity !== undefined && it.quantity !== null) ? it.quantity : 0);
            const qty = Number(qtyVal);

            if (!productId || !colorId || !sizeId || !(qty > 0)) continue;

            // validate ObjectId
            if (!mongoose.Types.ObjectId.isValid(productId) ||
                !mongoose.Types.ObjectId.isValid(colorId) ||
                !mongoose.Types.ObjectId.isValid(sizeId)
            ) {
                return res.status(400).json({ message: 'ID không hợp lệ' });
            }

            // lấy sản phẩm để kiểm tra tồn khả dụng
            const product = await Product.findById(productId).lean();
            if (!product) return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });

            const variant = (product.variants || []).find(v => String(v.color) === String(colorId));
            if (!variant) return res.status(404).json({ message: 'Không tìm thấy màu trong sản phẩm' });
            if (!product.isActive || !variant.isActive) {
                return res.status(400).json({ message: 'Sản phẩm hoặc màu đang ẩn' });
            }

            const sz = (variant.sizes || []).find(s => String(s.size) === String(sizeId));
            if (!sz) return res.status(404).json({ message: 'Không tìm thấy size trong màu' });
            if (!sz.isActive) return res.status(400).json({ message: 'Size đang ẩn' });

            const available = Math.max(0, Number(sz.quantity || 0) - Number(sz.sold || 0));
            if (available < qty) {
                return res.status(400).json({ message: `Tồn không đủ (còn ${available}, cần ${qty})` });
            }

            // Cộng sold (KHÔNG trừ quantity)
            await Product.updateOne({ _id: productId }, {
                $inc: {
                    'variants.$[v].sizes.$[s].sold': qty,
                },
            }, {
                arrayFilters: [
                    { 'v.color': new mongoose.Types.ObjectId(colorId) },
                    { 's.size': new mongoose.Types.ObjectId(sizeId) },
                ],
            });

            touched.add(productId);
        }

        // Sau khi cập nhật tất cả items: kiểm tra từng sản phẩm đã đụng
        for (const pid of touched) {
            const p = await Product.findById(pid).select('isActive variants').lean();
            if (!p) continue;

            // tính tổng tồn còn = sum(max(quantity - sold, 0)) trên mọi biến thể/size
            let remain = 0;
            for (const v of(p.variants || [])) {
                for (const s of(v.sizes || [])) {
                    const left = Math.max(0, Number(s.quantity || 0) - Number(s.sold || 0));
                    remain += left;
                }
            }

            // nếu hết hàng và đang active -> ẩn cho phía người dùng
            if (remain <= 0 && p.isActive) {
                await Product.updateOne({ _id: pid }, { $set: { isActive: false } });
            }
        }

        return res.json({ success: true });
    } catch (err) {
        console.error('applyPurchase error:', err);
        return res.status(500).json({
            success: false,
            message: 'Không thể cập nhật tồn kho',
            error: String(err && err.message ? err.message : err),
        });
    }
};