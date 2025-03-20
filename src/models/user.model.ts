import mongoose, {Schema, Document} from 'mongoose';

interface userDocument extends Document {
    name: string;
    email: string;
    createdAt: Date;
}

const userSchema: Schema = new Schema({
    name: {type: String, required: true},
    email: {type: String, required: true},
    createdAt: {type: Date, required: true},
});

const UserModel = mongoose.model<userDocument>('UserModel', userSchema);

export default UserModel;