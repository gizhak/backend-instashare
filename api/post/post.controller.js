import { postService } from './post.service.js';
import { logger } from '../../services/logger.service.js';

// removePostComment,

export async function getPosts(req, res) {
	try {
		// const filterBy = {
		//     txt: req.query.txt || '',
		//     minSpeed: +req.query.minSpeed || 0,
		//     sortField: req.query.sortField || '',
		//     sortDir: req.query.sortDir || 1,
		//     pageIdx: req.query.pageIdx,

		const posts = await postService.query();
		res.json(posts);
	} catch (err) {
		logger.error('Failed to get posts', err);
		res.status(400).send({ err: 'Failed to get posts' });
	}
}

export async function getPostById(req, res) {
	try {
		const postId = req.params.id;
		const post = await postService.getById(postId);
		res.json(post);
	} catch (err) {
		logger.error('Failed to get post', err);
		res.status(400).send({ err: 'Failed to get post' });
	}
}

export async function addPost(req, res) {
	const { loggedinUser, body } = req;
	const post = {
		txt: body.txt,
		tags: body.tags,
		likedBy: body.likedBy,
		imgUrl: body.imgUrl,
		createdAt: new Date(),
		comments: body.comments,
		by: loggedinUser,
	};
	try {
		post.by = loggedinUser;
		const addedPost = await postService.add(post);
		res.json(addedPost);
	} catch (err) {
		logger.error('Failed to add post', err);
		res.status(400).send({ err: 'Failed to add post' });
	}
}

export async function updatePost(req, res) {
	const { loggedinUser, body: post } = req;
	const { _id: userId, isAdmin } = loggedinUser;

	// if(!isAdmin && car.owner._id !== userId) {
	//     res.status(403).send('Not your car...')
	//     return
	// }

	try {
		const updatedPost = await postService.update(post);
		res.json(updatedPost);
	} catch (err) {
		logger.error('Failed to update post', err);
		res.status(400).send({ err: 'Failed to update post' });
	}
}

export async function removePost(req, res) {
	try {
		const postId = req.params.id;
		const removedId = await postService.remove(postId);

		res.send(removedId);
	} catch (err) {
		logger.error('Failed to remove post', err);
		res.status(400).send({ err: 'Failed to remove post' });
	}
}

export async function addPostComment(req, res) {
	const { loggedinUser } = req;

	try {
		const postId = req.params.id;
		const comment = {
			date: new Date(),
			likedBy: req.body.likedBy || [],
			txt: req.body.txt,
			by: loggedinUser,
		};
		const savedComment = await postService.addPostComment(postId, comment);
		res.json(savedComment);
	} catch (err) {
		logger.error('Failed to add post comment', err);
		res.status(400).send({ err: 'Failed to add post comment' });
	}
}

export async function removePostComment(req, res) {
	try {
		const { id: postId, commentId } = req.params;

		const removedId = await postService.removePostComment(postId, commentId);
		res.send(removedId);
	} catch (err) {
		logger.error('Failed to remove post comment', err);
		res.status(400).send({ err: 'Failed to remove post comment' });
	}
}

export async function togglePostLike(req, res) {
	const { loggedinUser } = req;
	try {
		const postId = req.params.id;
		const updatedPost = await postService.togglePostLike(postId, loggedinUser._id);
		res.json(updatedPost);
	} catch (err) {
		logger.error('Failed to toggle post like', err);
		res.status(400).send({ err: 'Failed to toggle post like' });
	}
}

export async function toggleCommentLike(req, res) {
	const { loggedinUser } = req;
	try {
		const { id: postId, commentId } = req.params;
		const updatedPost = await postService.toggleCommentLike(postId, commentId, loggedinUser._id);
		res.json(updatedPost);
	} catch (err) {
		logger.error('Failed to toggle comment like', err);
		res.status(400).send({ err: 'Failed to toggle comment like' });
	}
}
