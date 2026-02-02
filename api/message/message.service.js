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
		const { ObjectId } = await import('mongodb');

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

			if (otherUserId && otherUserId !== userIdStr && !conversationsMap.has(otherUserId)) {
				// Always fetch fresh user data from DB
				try {
					const user = await usersCollection.findOne({ _id: ObjectId.createFromHexString(otherUserId) });
					if (user) {
						conversationsMap.set(otherUserId, {
							otherUserId,
							otherFullname: user.fullname,
							imgUrl: user.imgUrl || '',
							username: user.username,
							lastMessage: msg.txt,
							lastMessageAt: msg.createdAt,
						});
					}
				} catch (err) {
					logger.warn(`Could not fetch user data for ${otherUserId}`, err);
					// Fallback to message data if user fetch fails
					const otherFullname = isFromMe ? msg.toFullname : msg.fromFullname;
					const otherImgUrl = isFromMe ? msg.toImgUrl : msg.fromImgUrl;
					conversationsMap.set(otherUserId, {
						otherUserId,
						otherFullname,
						imgUrl: otherImgUrl || '',
						lastMessage: msg.txt,
						lastMessageAt: msg.createdAt,
					});
				}
			}
		}

		const conversations = Array.from(conversationsMap.values());
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
