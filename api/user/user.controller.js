import { userService } from './user.service.js'
import { logger } from '../../services/logger.service.js'
import { socketService } from '../../services/socket.service.js'

export async function getUser(req, res) {
    try {
        const user = await userService.getById(req.params.id)
        res.send(user)
    } catch (err) {
        logger.error('Failed to get user', err)
        res.status(400).send({ err: 'Failed to get user' })
    }
}

export async function getUsers(req, res) {
    try {
        const filterBy = {
            txt: req.query?.txt || '',
            minBalance: +req.query?.minBalance || 0
        }
        const users = await userService.query(filterBy)
        res.send(users)
    } catch (err) {
        logger.error('Failed to get users', err)
        res.status(400).send({ err: 'Failed to get users' })
    }
}

export async function getRemovedUsers(req, res) {
    try {
        const users = await userService.getRemovedUsers()
        res.send(users)
    } catch (err) {
        logger.error('Failed to get removed users', err)
        res.status(400).send({ err: 'Failed to get removed users' })
    }
}

export async function reactivateUser(req, res) {
    try {
        const userId = req.params.id
        const { password } = req.body

        if (!password) {
            return res.status(400).send({ err: 'Password is required' })
        }

        const user = await userService.reactivateUser(userId, password)
        logger.info(`User ${userId} reactivated successfully`)
        res.send(user)
    } catch (err) {
        logger.error('Failed to reactivate user', err)
        if (err.message === 'Incorrect password') {
            res.status(401).send({ err: 'Incorrect password' })
        } else {
            res.status(400).send({ err: 'Failed to reactivate user' })
        }
    }
}

export async function deleteUser(req, res) {
    try {
        const userIdToDelete = req.params.id
        const loggedinUser = req.loggedinUser

        logger.info(`Delete request received for user: ${userIdToDelete} by ${loggedinUser._id}`)

        // Allow users to delete themselves OR admins to delete anyone
        if (loggedinUser._id !== userIdToDelete && !loggedinUser.isAdmin) {
            logger.warn(`User ${loggedinUser._id} tried to delete ${userIdToDelete} - not authorized`)
            return res.status(403).send({ err: 'Not authorized to delete this user' })
        }

        await userService.remove(userIdToDelete)
        logger.info(`User ${userIdToDelete} removed successfully`)
        res.send({ msg: 'Deleted successfully' })
    } catch (err) {
        logger.error('Failed to delete user', err)
        res.status(400).send({ err: 'Failed to delete user' })
    }
}

export async function updateUser(req, res) {
    try {
        const user = req.body
        const savedUser = await userService.update(user)
        res.send(savedUser)
    } catch (err) {
        logger.error('Failed to update user', err)
        res.status(400).send({ err: 'Failed to update user' })
    }
}
