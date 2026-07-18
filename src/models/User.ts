import mongoose, { Document, Schema, Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import { UserRole } from '../types';

export interface IUser extends Document {
    email: string;
    password: string;
    name: string;
    role: UserRole;
    isActive: boolean;
    lastLoginAt?: Date;
    refreshTokenHash?: string;
    createdAt: Date;
    updatedAt: Date;
    comparePassword(candidate: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
        },
        password: { type: String, required: true, minlength: 8, select: false },
        name: { type: String, required: true, trim: true, maxlength: 100 },
        role: {
            type: String,
            enum: ['ADMIN', 'ANALYST', 'VIEWER'],
            default: 'VIEWER',
        },
        isActive: { type: Boolean, default: true },
        lastLoginAt: { type: Date },
        refreshTokenHash: { type: String, select: false },
    },
    { timestamps: true, collection: 'users' }
);

UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ role: 1 });

// Hash password before saving
UserSchema.pre<IUser>('save', async function (next: any) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

UserSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
    return bcrypt.compare(candidate, this.password);
};

// Never return password in JSON responses
UserSchema.set('toJSON', {
    transform(_doc: any, ret: any) {
        delete ret['password'];
        delete ret['refreshTokenHash'];
        return ret;
    },
});

export const User: Model<IUser> = mongoose.model('User', UserSchema);
