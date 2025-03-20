import { Request, Response } from 'express';
import UserModel from '../models/user.model'
import axios from 'axios';
import logger from '../utils/logger';

export const createUser = async (req: Request, res: Response) => {
    try {
        const newUser = new UserModel(req.body);
        await newUser.save();
        res.status(201).json(newUser);
    } catch (err) {
        res.status(500).json({ message: 'Error creating item', err})
        logger.error('Error creating user', err)
    }
}

export const fetchExternalData = async (req: Request, res: Response) => {
    try{
        const response = await axios.get("https://jsonplaceholder.typicode.com/todos/2");
        res.status(200).json(response.data);
    } catch (error){
        res.status(500).json({message:"Error fetching external data", error});
    }
}