import mongoose from 'mongoose';

const contactSchema = new mongoose.Schema(
  {
    from_name: { type: String, required: true, trim: true },
    from_email: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    status: { type: String, enum: ['new', 'read', 'closed'], default: 'new' },

    ip: String,
    userAgent: String,
  },
  { timestamps: true }
);

const ContactMessage = mongoose.model('ContactMessage', contactSchema);
export default ContactMessage;
