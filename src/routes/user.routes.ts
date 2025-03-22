import { Router } from 'express';
import * as userCont from '../controllers/user.controller';

const router = Router()

// ##### PUBLIC #####

// todo swagger
router.post('/', userCont.createUser);

// todo swagger
router.put('/', userCont.updateUser);

// todo swagger
router.delete('/', userCont.deleteUser);

// todo swagger
router.post('/login', userCont.login);

// todo swagger
router.post('/:id', userCont.getUser);

// todo swagger
router.post('/request-unblock', userCont.requestUnblock);

// ##### ADMIN #####

// todo swagger
router.get('/', userCont.getAllUsers);

// todo swagger
router.post('/block', userCont.blockUser);

// todo swagger
router.post('/unblock', userCont.unBlockUser);

export default router;