import { logger } from '../../services/logger.service.js';
import { dbService } from '../../services/db.service.js';

export const messageService = {
	getMessages,
	addMessage,
	getConversations,
	deleteConversation,
};

async function getMessages(userId1, userId2) {
	try {
		const collection = await dbService.getCollection('message');
		const messages = await collection
			.find({
				$or: [
					{ fromUserId: userId1, toUserId: userId2 },
					{ fromUserId: userId2, toUserId: userId1 },
				],
			})
			.sort({ createdAt: 1 })
			.toArray();
		return messages;
	} catch (err) {
		logger.error('cannot find messages', err);
		throw err;
	}
}

async function addMessage(message) {
	try {
		const collection = await dbService.getCollection('message');
		const usersCollection = await dbService.getCollection('user');

		// Fetch actual user data from DB to ensure accuracy
		let fromFullname = message.fromFullname;
		let fromImgUrl = message.fromImgUrl || '';
		let toFullname = message.toFullname;
		let toImgUrl = message.toImgUrl || '';

		try {
			const { ObjectId } = await import('mongodb');

			// Get sender's actual data
			if (message.fromUserId) {
				const fromUser = await usersCollection.findOne({ _id: ObjectId.createFromHexString(message.fromUserId) });
				if (fromUser) {
					fromFullname = fromUser.fullname;
					fromImgUrl = fromUser.imgUrl || '';
				}
			}

			// Get recipient's actual data
			if (message.toUserId) {
				const toUser = await usersCollection.findOne({ _id: ObjectId.createFromHexString(message.toUserId) });
				if (toUser) {
					toFullname = toUser.fullname;
					toImgUrl = toUser.imgUrl || '';
				}
			}
		} catch (err) {
			logger.warn('Could not fetch user data for message', err);
		}

		const messageToAdd = {
			fromUserId: message.fromUserId,
			fromFullname,
			fromImgUrl,
			toUserId: message.toUserId,
			toFullname,
			toImgUrl,
			txt: message.txt,
			createdAt: new Date(),
		};
		await collection.insertOne(messageToAdd);
		return messageToAdd;
	} catch (err) {
		logger.error('cannot add message', err);
		throw err;
	}
}

async function getConversations(userId) {
	try {
		const collection = await dbService.getCollection('message');
		const usersCollection = await dbService.getCollection('user');

		// Ensure userId is a string for comparison
		const userIdStr = userId.toString();

		const messages = await collection
			.find({
				$or: [{ fromUserId: userIdStr }, { toUserId: userIdStr }],
			})
			.sort({ createdAt: -1 })
			.toArray();

		// Get unique conversations
		const conversationsMap = new Map();
		for (const msg of messages) {
			// Convert to strings for reliable comparison
			const fromUserIdStr = msg.fromUserId?.toString();
			const toUserIdStr = msg.toUserId?.toString();

			// Determine the other user in this conversation
			const isFromMe = fromUserIdStr === userIdStr;
			const otherUserId = isFromMe ? toUserIdStr : fromUserIdStr;
			const otherFullname = isFromMe ? msg.toFullname : msg.fromFullname;
			const otherImgUrl = isFromMe ? msg.toImgUrl : msg.fromImgUrl;

			if (otherUserId && otherUserId !== userIdStr && !conversationsMap.has(otherUserId)) {
				conversationsMap.set(otherUserId, {
					otherUserId,
					otherFullname,
					imgUrl: otherImgUrl || '',
					lastMessage: msg.txt,
					lastMessageAt: msg.createdAt,
				});
			}
		}

		// Fetch user images for conversations that don't have them
		const conversations = Array.from(conversationsMap.values());
		for (const convo of conversations) {
			// If we don't have imgUrl from messages, try to fetch from users collection
			if (!convo.imgUrl) {
				try {
					const { ObjectId } = await import('mongodb');
					const user = await usersCollection.findOne({ _id: ObjectId.createFromHexString(convo.otherUserId) });
					if (user) {
						convo.imgUrl = user.imgUrl;
						convo.username = user.username;
						convo.otherFullname = user.fullname || convo.otherFullname;
					}
				} catch (err) {
					logger.warn(`Could not fetch user data for ${convo.otherUserId}`, err);
				}
			}
		}

		return conversations;
	} catch (err) {
		logger.error('cannot get conversations', err);
		throw err;
	}
}

async function deleteConversation(userId, otherUserId) {
	try {
		const collection = await dbService.getCollection('message');
		const result = await collection.deleteMany({
			$or: [
				{ fromUserId: userId, toUserId: otherUserId },
				{ fromUserId: otherUserId, toUserId: userId },
			],
		});
		logger.info(`Deleted ${result.deletedCount} messages between ${userId} and ${otherUserId}`);
		return result;
	} catch (err) {
		logger.error('cannot delete conversation', err);
		throw err;
	}
}
