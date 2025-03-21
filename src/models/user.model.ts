import mongoose, {Schema, Document} from 'mongoose';

enum UserRole {
    SMALL_FARMER = 'Agricultor pequeño',
    MEDIUM_FARMER = 'Agricultor mediano',
    BIG_FARMER = 'Agricultor grande',
    COOP_PRESIDENT = 'Presidente de cooperativa',
    WHOLESALER = 'Mayorista',
    EXPERT = 'Experto'
};

interface IUser extends Document {
    userID: string;
    username: string;
    email: string;
    passwordHash: string,
    profilePicture?: string,
    role: UserRole,
    communityResidence: string,
    isAdmin: boolean,
    createdAt: Date,
};

const userSchema: Schema = new Schema({
    // todo
});

const UserModel = mongoose.model<IUser>('User', userSchema);

export default UserModel;