import mongoose from 'mongoose'

const parseVariantsFromBody = (body, files) => {
    const variants = []

    if (Array.isArray(body.variants)) {
        body.variants.forEach((v, i) => {
            // ❌ Bỏ qua nếu không có color hoặc color là chuỗi rỗng
            if (!v.color || v.color === '') return

            const variant = {
                color: new mongoose.Types.ObjectId(v.color),
                sizes: [],
                isActive: v.isActive !== undefined ?
                    v.isActive === 'true' || v.isActive === '1' :
                    true,
            }

            if (Array.isArray(v.sizes)) {
                v.sizes.forEach((s) => {
                    // ❌ Bỏ qua nếu không có size
                    if (!s.size || s.size === '') return

                    const sizeObj = {
                        size: new mongoose.Types.ObjectId(s.size),
                        quantity: parseInt(s.quantity) || 0,
                        sold: parseInt(s.sold) || 0,
                        isActive: s.isActive !== undefined ?
                            s.isActive === 'true' || s.isActive === '1' :
                            true,
                    }

                    variant.sizes.push(sizeObj)
                })
            }

            // ✅ Xử lý ảnh đúng theo fieldname `variants[${i}][image]`
            const imageField = `variants[${i}][image]`
            let file = null

            if (Array.isArray(files)) {
                file = files.find((f) => f.fieldname === imageField)
            } else if (files && typeof files === 'object' && files[imageField]) {
                file = files[imageField][0]
            }

            if (file) {
                variant.image = `/uploads/products/${file.filename}`
            } else if (v.oldImage) {
                variant.image = v.oldImage // trường hợp sửa không thay ảnh
            }

            // ✅ Chỉ push nếu có size và color
            if (variant.sizes.length > 0) {
                variants.push(variant)
            }
        })
    }

    return variants
}

export default parseVariantsFromBody
