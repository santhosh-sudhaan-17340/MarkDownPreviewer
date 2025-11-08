import { Router, Request, Response } from 'express';
import prisma from '../config/database';

const router = Router();

/**
 * Create a new skill
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Skill name is required' });
    }

    const skill = await prisma.skill.create({
      data: {
        name,
        description,
      },
    });

    res.status(201).json(skill);
  } catch (error: any) {
    console.error('Error creating skill:', error);
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Skill already exists' });
    }
    res.status(500).json({ error: 'Failed to create skill' });
  }
});

/**
 * Get all skills
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const skills = await prisma.skill.findMany({
      include: {
        agents: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        tickets: {
          where: {
            status: {
              notIn: ['RESOLVED', 'CLOSED'],
            },
          },
          select: {
            id: true,
          },
        },
      },
    });

    const skillsWithStats = skills.map((skill) => ({
      ...skill,
      agentCount: skill.agents.length,
      activeTicketCount: skill.tickets.length,
    }));

    res.json(skillsWithStats);
  } catch (error) {
    console.error('Error getting skills:', error);
    res.status(500).json({ error: 'Failed to get skills' });
  }
});

/**
 * Get skill by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const skill = await prisma.skill.findUnique({
      where: { id: req.params.id },
      include: {
        agents: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
        },
        tickets: {
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: {
            createdBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            assignedTo: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    res.json(skill);
  } catch (error) {
    console.error('Error getting skill:', error);
    res.status(500).json({ error: 'Failed to get skill' });
  }
});

/**
 * Update skill
 */
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;

    const skill = await prisma.skill.update({
      where: { id: req.params.id },
      data: { name, description },
    });

    res.json(skill);
  } catch (error) {
    console.error('Error updating skill:', error);
    res.status(500).json({ error: 'Failed to update skill' });
  }
});

/**
 * Delete skill
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.skill.delete({
      where: { id: req.params.id },
    });

    res.json({ message: 'Skill deleted successfully' });
  } catch (error) {
    console.error('Error deleting skill:', error);
    res.status(500).json({ error: 'Failed to delete skill' });
  }
});

export default router;
