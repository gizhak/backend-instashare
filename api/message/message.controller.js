import { messageService } from './message.service.js';
import { logger } from '../../services/logger.service.js';
import { socketService } from '../../services/socket.service.js';

export async function getMessages(req, res) {
	try {
		const { otherUserId } = req.params;
		const loggedinUser = req.loggedinUser;
		const messages = await messageService.getMessages(loggedinUser._id, otherUserId);
		res.json(messages);
	} catch (err) {
		logger.error('Failed to get messages', err);
		res.status(400).send({ err: 'Failed to get messages' });
	}
}

export async function addMessage(req, res) {
	try {
		const loggedinUser = req.loggedinUser;
		const { toUserId, toFullname, txt } = req.body;

		const message = {
			fromUserId: loggedinUser._id,
			fromFullname: loggedinUser.fullname,
			toUserId,
			toFullname,
			txt,
		};

		const savedMessage = await messageService.addMessage(message);

		// Emit to recipient via socket
		socketService.emitToUser({
			type: 'chat-add-msg',
			data: savedMessage,
			userId: toUserId,
		});

		res.json(savedMessage);
	} catch (err) {
		logger.error('Failed to add message', err);
		res.status(400).send({ err: 'Failed to add message' });
	}
}

export async function getConversations(req, res) {
	try {
		const loggedinUser = req.loggedinUser;
		const conversations = await messageService.getConversations(loggedinUser._id);
		res.json(conversations);
	} catch (err) {
		logger.error('Failed to get conversations', err);
		res.status(400).send({ err: 'Failed to get conversations' });
	}
}

export async function deleteConversation(req, res) {
	try {
		const { otherUserId } = req.params;
		const loggedinUser = req.loggedinUser;
		const result = await messageService.deleteConversation(loggedinUser._id, otherUserId);
		res.json(result);
	} catch (err) {
		logger.error('Failed to delete conversation', err);
		res.status(400).send({ err: 'Failed to delete conversation' });
	}
}
