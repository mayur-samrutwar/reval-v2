import mongoose from 'mongoose';

const VerificationSchema = new mongoose.Schema({
  groupId: String,
  memberId: String,
  verificationStatus: { type: Boolean, default: false },
  verificationLink: String,
  reclaimStatusUrl: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

VerificationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.models.Verification || mongoose.model('Verification', VerificationSchema);