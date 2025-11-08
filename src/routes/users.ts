import { Router, Request, Response } from 'express';
import prisma from '../config/database';
import { UserRole } from '@prisma/client';

const router = Router();

/**
 * Create a new user
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { email, name, role, skillIds } = req.body;

    if (!email || !name) {
      return res.status(400).json({ error: 'Missing required fields: email, name' });
    }

    const user = await prisma.user.create({
      data: {
        email,
        name,
        role: role || UserRole.USER,
        skills: skillIds
          ? {
              create: skillIds.map((skillId: string) => ({
                skillId,
                proficiency: 3, // Default proficiency
              })),
            }
          : undefined,
      },
      include: {
        skills: {
          include: {
            skill: true,
          },
        },
      },
    });

    res.status(201).json(user);
  } catch (error: any) {
    console.error('Error creating user:', error);
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: 'Failed to create user' });
  }
});

/**
 * Get all users
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { role } = req.query;

    const where: any = {};
    if (role) where.role = role as UserRole;

    const users = await prisma.user.findMany({
      where,
      include: {
        skills: {
          include: {
            skill: true,
          },
        },
      },
    });

    res.json(users);
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

/**
 * Get user by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: {
        skills: {
          include: {
            skill: true,
          },
        },
        ticketsCreated: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        ticketsAssigned: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

/**
 * Update user
 */
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { name, role } = req.body;

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { name, role },
      include: {
        skills: {
          include: {
            skill: true,
          },
        },
      },
    });

    res.json(user);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

/**
 * Add skill to user (agent)
 */
router.post('/:id/skills', async (req: Request, res: Response) => {
  try {
    const { skillId, proficiency } = req.body;

    if (!skillId) {
      return res.status(400).json({ error: 'skillId is required' });
    }

    const agentSkill = await prisma.agentSkill.create({
      data: {
        userId: req.params.id,
        skillId,
        proficiency: proficiency || 3,
      },
      include: {
        skill: true,
      },
    });

    res.status(201).json(agentSkill);
  } catch (error: any) {
    console.error('Error adding skill:', error);
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'User already has this skill' });
    }
    res.status(500).json({ error: 'Failed to add skill' });
  }
});

/**
 * Update agent skill proficiency
 */
router.patch('/:userId/skills/:skillId', async (req: Request, res: Response) => {
  try {
    const { proficiency } = req.body;

    const agentSkill = await prisma.agentSkill.updateMany({
      where: {
        userId: req.params.userId,
        skillId: req.params.skillId,
      },
      data: { proficiency },
    });

    res.json(agentSkill);
  } catch (error) {
    console.error('Error updating skill proficiency:', error);
    res.status(500).json({ error: 'Failed to update skill proficiency' });
  }
});

/**
 * Remove skill from user
 */
router.delete('/:userId/skills/:skillId', async (req: Request, res: Response) => {
  try {
    await prisma.agentSkill.deleteMany({
      where: {
        userId: req.params.userId,
        skillId: req.params.skillId,
      },
    });

    res.json({ message: 'Skill removed successfully' });
  } catch (error) {
    console.error('Error removing skill:', error);
    res.status(500).json({ error: 'Failed to remove skill' });
  }
});

export default router;
