import { Router, RequestHandler } from 'express';
import { Op } from 'sequelize';

import type { SequelizeClient } from '../sequelize';
import { User, Post } from '../repositories/types';

import { BadRequestError, UnauthorizedError } from '../errors';
import { initTokenValidationRequestHandler, initAdminValidationRequestHandler, RequestAuth } from '../middleware/security';
import { UserType } from '../constants';

// check how to implement Dependency Injection
export function initPostsRouter(sequelizeClient: SequelizeClient): Router {
    const router = Router({ mergeParams: true });

    // `tokenValidation` need to be set as a middleware. 
    const tokenValidation = initTokenValidationRequestHandler(sequelizeClient);

    // remove non used constants
    const adminValidation = initAdminValidationRequestHandler();

    router.route('/')
        .get(initListPostsRequestHandler(sequelizeClient))
        .post(tokenValidation, initCreatePostRequestHandler(sequelizeClient));

    router.route('/:id')
        .get(tokenValidation, initGetPostsRequestHandler(sequelizeClient))
        .put(tokenValidation, initUpdatePostRequestHandler(sequelizeClient))
        .delete(tokenValidation, initDeletePostRequestHandler(sequelizeClient));
    return router;
}

function initListPostsRequestHandler(sequelizeClient: SequelizeClient): RequestHandler {
    return async function listPostsRequestHandler(req, res, next): Promise<void> {
        const { models } = sequelizeClient;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
        const { user } = (req as any).auth as RequestAuth;
        try {

            // `Posts.filter((post) => !post.isHidden)` this filter can be done on DB side
            const Posts = await models.posts.findAll();
            if (user.type == UserType.BLOGGER) { Posts.filter((post) => !post.isHidden); }
            res.send(Posts);
            return res.end();
        } catch (error) {
            next(error);
        }
    };
}

function initCreatePostRequestHandler(sequelizeClient: SequelizeClient): RequestHandler {
    return async function createPostRequestHandler(req, res, next): Promise<void> {
        try {
            // NOTE(roman): missing validation and cleaning
            const { title, content, authorId, isHidden } = req.body as CreatePostData;
            await createPost({ title, content, authorId, isHidden }, sequelizeClient);
            return res.status(204).end();
        } catch (error) {
            next(error);
        }
    };
}

function initGetPostsRequestHandler(sequelizeClient: SequelizeClient): RequestHandler {
    return async function getPostsRequestHandler(req, res, next): Promise<void> {
        const { models } = sequelizeClient;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
        const { user } = (req as any).auth as RequestAuth;
        try {
            const id = parseInt(req.params.id);
            const Post = await models.posts.findOne({ where: { id } });
            if (user.type == UserType.BLOGGER && Post?.isHidden) throw new UnauthorizedError('POST_NOT_FOUND');
            if (!Post) throw new BadRequestError('POST_NOT_FOUND');
            res.send(Post);
            return res.end();
        } catch (error) {
            next(error);
        }
    };
}

function initUpdatePostRequestHandler(sequelizeClient: SequelizeClient): RequestHandler {
    return async function updatePostRequestHandler(req, res, next): Promise<void> {
        try {
            // NOTE(roman): missing validation and cleaning
            const { title, content, authorId, isHidden } = req.body as UpdatePostData;
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
            const { user } = (req as any).auth as RequestAuth;
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            await updatePost(parseInt(req.params.id), user, { title, content, authorId, isHidden }, sequelizeClient);
            return res.status(204).end();
        } catch (error) {
            next(error);
        }
    };
}

function initDeletePostRequestHandler(sequelizeClient: SequelizeClient): RequestHandler {
    return async function deletePostRequestHandler(req, res, next): Promise<void> {
        try {
            // NOTE(roman): missing validation and cleaning
            const { models } = sequelizeClient;
            const id = parseInt(req.params.id);
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
            const { user } = (req as any).auth as RequestAuth;
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            if (user.type == UserType.BLOGGER)
                await models.posts.destroy({ where: { id, authorId: user.id } });
            else await models.posts.destroy({ where: { id, isHidden: false } });
            return res.status(204).end();
        } catch (error) {
            next(error);
        }
    };
}

async function createPost(data: CreatePostData, sequelizeClient: SequelizeClient): Promise<void> {
    // need to validate user input
    const { title, content, authorId, isHidden } = data;

    const { models } = sequelizeClient;
    // try to add validations in separate function/ middleware. This will simplify the process of writing unit tests, and reutilization.
    const similarPost = await models.posts.findOne({
        attributes: ['id', 'title', 'content'],
        where: {
            [Op.or]: [
                { title },
                { content },
            ],
        },
        raw: true,
    }) as Pick<Post, 'id' | 'title' | 'content'> | null;
    // instead of select one, you can count, this will be faster
    if (similarPost) throw new BadRequestError('POST_ALREADY_EXISTS');

    await models.posts.create({ title, content, authorId, isHidden });
}

async function updatePost(id: number, user: User, data: UpdatePostData, sequelizeClient: SequelizeClient): Promise<void> {
    // need to validate user input
    const { title, content, authorId, isHidden } = data;

    const { models } = sequelizeClient;
    const post = await models.posts.findOne({ where: { id } });
    if (user.type == UserType.BLOGGER && post?.authorId != user.id) throw new UnauthorizedError('YOU_CANT_UPDATE_THIS_POST');
    if (!post) throw new BadRequestError('YOUR_POST_NOT_FOUND');
    await post.update({ title, content, authorId, isHidden });
}

type CreatePostData = Pick<Post, 'title' | 'content' | 'authorId' | 'isHidden'>;
type UpdatePostData = Pick<Post, 'title' | 'content' | 'authorId' | 'isHidden'>;