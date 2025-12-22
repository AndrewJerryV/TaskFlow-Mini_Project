import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Create Users
  const u1 = await prisma.user.upsert({
    where: { email: 'andrew@example.com' },
    update: {},
    create: {
      id: 'u1',
      name: 'Andrew User',
      email: 'andrew@example.com',
      role: 'Admin',
      avatarUrl: 'https://ui-avatars.com/api/?name=Andrew+User&background=0D8ABC&color=fff'
    },
  })

  const u2 = await prisma.user.upsert({
    where: { email: 'jane@example.com' },
    update: {},
    create: {
      id: 'u2',
      name: 'Jane Doe',
      email: 'jane@example.com',
      role: 'Manager',
      avatarUrl: 'https://ui-avatars.com/api/?name=Jane+Doe&background=random'
    },
  })

  // Create Project
  const p1 = await prisma.project.upsert({
    where: { key: 'TF' },
    update: {},
    create: {
      id: 'p1',
      name: 'TaskFlow Development',
      description: 'Building the ultimate work management platform.',
      key: 'TF',
      ownerId: u1.id,
    },
  })

  // Create Tasks
  await prisma.task.upsert({
    where: { id: 't1' },
    update: {},
    create: {
      id: 't1',
      projectId: p1.id,
      title: 'Initialize Project',
      description: 'Set up Next.js and Tailwind.',
      status: 'Done',
      priority: 'High',
      assigneeId: u1.id,
      tags: JSON.stringify(['Dev', 'Setup']),
    },
  })

  await prisma.task.upsert({
    where: { id: 't2' },
    update: {},
    create: {
      id: 't2',
      projectId: p1.id,
      title: 'Implement Task Board',
      description: 'Create a Kanban board using dnd-kit.',
      status: 'In Progress',
      priority: 'Critical',
      assigneeId: u1.id,
      startDate: new Date().toISOString(),
      dueDate: new Date(Date.now() + 86400000 * 3).toISOString(),
      tags: JSON.stringify(['Feature', 'Frontend']),
    },
  })

  console.log({ u1, u2, p1 })
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
