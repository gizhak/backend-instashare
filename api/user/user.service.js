import { dbService } from '../../services/db.service.js';
import { logger } from '../../services/logger.service.js';
import { ObjectId } from 'mongodb';
import { reviewService } from '../review/review.service.js';

export const userService = {
	add, // Create (Signup)
	getById, // Read (Profile page)
	update, // Update (Edit profile)
	remove, // Delete (remove user)
	query, // List (of users)
	getByUsername, // Used for Login
	getRemovedUsers, // Get soft-deleted users
	reactivateUser, // Restore soft-deleted user
};

async function query(filterBy = {}) {
	const criteria = _buildCriteria(filterBy);
	// Only show active users (not soft-deleted)
	criteria.isActive = { $ne: false };
	try {
		const collection = await dbService.getCollection('user');
		var users = await collection.find(criteria).toArray();
		users = users.map((user) => {
			delete user.password;
			// Only get timestamp if _id is an ObjectId
			if (user._id && typeof user._id.getTimestamp === 'function') {
				user.createdAt = user._id.getTimestamp();
			}
			// Returning fake fresh data
			// user.createdAt = Date.now() - (1000 * 60 * 60 * 24 * 3) // 3 days ago
			return user;
		});
		return users;
	} catch (err) {
		logger.error('cannot find users', err);
		throw err;
	}
}

async function getById(userId) {
	try {
		// Support both ObjectId and string _id
		var criteria;
		if (ObjectId.isValid(userId) && userId.length === 24) {
			criteria = { _id: ObjectId.createFromHexString(userId) };
		} else {
			criteria = { _id: userId };
		}

		const collection = await dbService.getCollection('user');
		const user = await collection.findOne(criteria);

		if (!user) {
			throw new Error('User not found');
		}

		delete user.password;

		criteria = { byUserId: userId };

		user.givenReviews = await reviewService.query(criteria);
		console.log(user.givenReviews);
		user.givenReviews = user.givenReviews.map((review) => {
			delete review.byUser;
			return review;
		});

		return user;
	} catch (err) {
		logger.error(`while finding user by id: ${userId}`, err);
		throw err;
	}
}

async function getByUsername(username) {
	try {
		const collection = await dbService.getCollection('user');
		const user = await collection.findOne({ username });
		return user;
	} catch (err) {
		logger.error(`while finding user by username: ${username}`, err);
		throw err;
	}
}

async function remove(userId) {
	try {
		// Soft delete - mark user as inactive instead of deleting
		let criteria;
		if (ObjectId.isValid(userId) && userId.length === 24) {
			criteria = { _id: ObjectId.createFromHexString(userId) };
		} else {
			criteria = { _id: userId };
		}

		const collection = await dbService.getCollection('user');
		// Mark as inactive instead of deleting
		await collection.updateOne(criteria, { $set: { isActive: false } });
		logger.info(`User ${userId} marked as inactive (soft delete)`);
	} catch (err) {
		logger.error(`cannot remove user ${userId}`, err);
		throw err;
	}
}

// Hard delete - permanently remove user from DB (admin only, future feature)
async function permanentDelete(userId) {
	try {
		let criteria;
		if (ObjectId.isValid(userId) && userId.length === 24) {
			criteria = { _id: ObjectId.createFromHexString(userId) };
		} else {
			criteria = { _id: userId };
		}

		const collection = await dbService.getCollection('user');
		await collection.deleteOne(criteria);
		logger.info(`User ${userId} permanently deleted from DB`);
	} catch (err) {
		logger.error(`cannot permanently delete user ${userId}`, err);
		throw err;
	}
}

// Get soft-deleted users (isActive: false)
async function getRemovedUsers() {
	try {
		const collection = await dbService.getCollection('user');
		const users = await collection.find({ isActive: false }).toArray();
		// Remove password from results
		const sanitizedUsers = users.map(user => {
			delete user.password;
			return user;
		});
		logger.info(`Found ${sanitizedUsers.length} removed users`);
		return sanitizedUsers;
	} catch (err) {
		logger.error('cannot get removed users', err);
		throw err;
	}
}

// Reactivate a soft-deleted user
async function reactivateUser(userId, password) {
	try {
		let criteria;
		if (ObjectId.isValid(userId) && userId.length === 24) {
			criteria = { _id: ObjectId.createFromHexString(userId) };
		} else {
			criteria = { _id: userId };
		}

		const collection = await dbService.getCollection('user');
		// First, get the user to verify password
		const user = await collection.findOne(criteria);

		if (!user) {
			throw new Error('User not found');
		}

		// Verify password (assuming it's stored in plain text for now - not secure!)
		if (user.password !== password) {
			throw new Error('Incorrect password');
		}

		// Reactivate the user
		await collection.updateOne(criteria, { $set: { isActive: true } });
		logger.info(`User ${userId} reactivated successfully`);

		// Return user without password
		delete user.password;
		user.isActive = true;
		return user;
	} catch (err) {
		logger.error(`cannot reactivate user ${userId}`, err);
		throw err;
	}
}

async function update(user) {
	try {
		// Support both ObjectId and string _id
		let userId;
		if (ObjectId.isValid(user._id) && user._id.length === 24) {
			userId = ObjectId.createFromHexString(user._id);
		} else {
			userId = user._id;
		}

		// Build update object with only provided fields
		const userToSave = {};

		if (user.fullname !== undefined) userToSave.fullname = user.fullname;
		if (user.score !== undefined) userToSave.score = user.score;
		if (user.bio !== undefined) userToSave.bio = user.bio;
		if (user.imgUrl !== undefined) userToSave.imgUrl = user.imgUrl;
		if (user.gender !== undefined) userToSave.gender = user.gender;
		if (user.customGender !== undefined) userToSave.customGender = user.customGender;
		if (user.mobileOrEmail !== undefined) userToSave.mobileOrEmail = user.mobileOrEmail;
		if (user.website !== undefined) userToSave.website = user.website;
		if (user.following !== undefined) userToSave.following = user.following;
		if (user.followers !== undefined) userToSave.followers = user.followers;
		if (user.savedPostIds !== undefined) userToSave.savedPostIds = user.savedPostIds;
		if (user.recentSearches !== undefined) userToSave.recentSearches = user.recentSearches;

		const collection = await dbService.getCollection('user');
		await collection.updateOne({ _id: userId }, { $set: userToSave });

		// Get the full updated user from DB
		const updatedUser = await collection.findOne({ _id: userId });
		if (updatedUser) {
			delete updatedUser.password;
		}

		return updatedUser || { _id: user._id, ...userToSave };
	} catch (err) {
		logger.error(`cannot update user ${user._id}`, err);
		throw err;
	}
}

async function add(user) {
	try {
		// peek only updatable fields!
		const userToAdd = {
			username: user.username,
			password: user.password,
			fullname: user.fullname,
			imgUrl: user.imgUrl || '',
			isAdmin: user.isAdmin || false,
			isActive: true, // New users are active by default
			score: user.score || 100,
			bio: user.bio || '',
			gender: user.gender || '',
			customGender: user.customGender || '',
			mobileOrEmail: user.mobileOrEmail || '',
			website: user.website || '',
			following: user.following || [],
			followers: user.followers || [],
			savedPostIds: user.savedPostIds || [],
			recentSearches: user.recentSearches || [],
		};
		const collection = await dbService.getCollection('user');
		await collection.insertOne(userToAdd);
		return userToAdd;
	} catch (err) {
		logger.error('cannot add user', err);
		throw err;
	}
}

function _buildCriteria(filterBy) {
	const criteria = {};
	if (filterBy.txt) {
		const txtCriteria = { $regex: filterBy.txt, $options: 'i' };
		criteria.$or = [
			{
				username: txtCriteria,
			},
			{
				fullname: txtCriteria,
			},
		];
	}
	if (filterBy.minBalance) {
		criteria.score = { $gte: filterBy.minBalance };
	}
	return criteria;
}
