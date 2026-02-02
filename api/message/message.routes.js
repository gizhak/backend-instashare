import express from 'express';
import { requireAuth } from '../../middlewares/requireAuth.middleware.js';
import { getMessages, addMessage, getConversations, deleteConversation } from './message.controller.js';

const router = express.Router();

router.get('/conversations', requireAuth, getConversations);
router.get('/:otherUserId', requireAuth, getMessages);
router.post('/', requireAuth, addMessage);
router.delete('/:otherUserId', requireAuth, deleteConversation);

export const messageRoutes = router;
