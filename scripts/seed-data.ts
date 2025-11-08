/**
 * Seed script to populate the database with sample data
 * Run with: ts-node scripts/seed-data.ts
 */

import prisma from '../src/database/client';
import { ResourceType } from '@prisma/client';

async function main() {
  console.log('🌱 Starting database seeding...\n');

  try {
    // Clean existing data (optional - comment out if you want to keep existing data)
    console.log('Cleaning existing data...');
    await prisma.reminder.deleteMany();
    await prisma.noShowPenalty.deleteMany();
    await prisma.appointment.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.schedule.deleteMany();
    await prisma.cancellationRule.deleteMany();
    await prisma.resource.deleteMany();
    console.log('✓ Cleaned existing data\n');

    // Create Resources
    console.log('Creating resources...');

    const doctor1 = await prisma.resource.create({
      data: {
        name: 'Dr. Sarah Johnson',
        type: 'DOCTOR' as ResourceType,
        email: 'sarah.johnson@clinic.com',
        phone: '+1-555-0123',
        description: 'General Practitioner with 10 years experience'
      }
    });

    const doctor2 = await prisma.resource.create({
      data: {
        name: 'Dr. Michael Chen',
        type: 'DOCTOR' as ResourceType,
        email: 'michael.chen@clinic.com',
        phone: '+1-555-0124',
        description: 'Specialist in Internal Medicine'
      }
    });

    const barber1 = await prisma.resource.create({
      data: {
        name: 'Mike Stevens',
        type: 'BARBER' as ResourceType,
        email: 'mike@barbershop.com',
        phone: '+1-555-0456',
        description: 'Master barber with 15 years experience'
      }
    });

    const technician1 = await prisma.resource.create({
      data: {
        name: 'Emily Rodriguez',
        type: 'TECHNICIAN' as ResourceType,
        email: 'emily@techservices.com',
        phone: '+1-555-0789',
        description: 'Certified IT technician'
      }
    });

    console.log(`✓ Created ${4} resources\n`);

    // Create Schedules
    console.log('Creating schedules...');

    // Dr. Johnson: Mon-Fri 9:00-17:00
    for (let day = 1; day <= 5; day++) {
      await prisma.schedule.create({
        data: {
          resourceId: doctor1.id,
          dayOfWeek: day,
          startTime: '09:00',
          endTime: '17:00'
        }
      });
    }

    // Dr. Chen: Mon, Wed, Fri 10:00-18:00
    for (const day of [1, 3, 5]) {
      await prisma.schedule.create({
        data: {
          resourceId: doctor2.id,
          dayOfWeek: day,
          startTime: '10:00',
          endTime: '18:00'
        }
      });
    }

    // Mike (Barber): Tue-Sat 08:00-18:00
    for (let day = 2; day <= 6; day++) {
      await prisma.schedule.create({
        data: {
          resourceId: barber1.id,
          dayOfWeek: day,
          startTime: '08:00',
          endTime: '18:00'
        }
      });
    }

    // Emily (Technician): Mon-Thu 09:00-17:00
    for (let day = 1; day <= 4; day++) {
      await prisma.schedule.create({
        data: {
          resourceId: technician1.id,
          dayOfWeek: day,
          startTime: '09:00',
          endTime: '17:00'
        }
      });
    }

    console.log('✓ Created schedules for all resources\n');

    // Create Customers
    console.log('Creating customers...');

    const customers = await Promise.all([
      prisma.customer.create({
        data: {
          name: 'John Doe',
          email: 'john.doe@email.com',
          phone: '+1-555-1001'
        }
      }),
      prisma.customer.create({
        data: {
          name: 'Jane Smith',
          email: 'jane.smith@email.com',
          phone: '+1-555-1002'
        }
      }),
      prisma.customer.create({
        data: {
          name: 'Robert Williams',
          email: 'robert.williams@email.com',
          phone: '+1-555-1003'
        }
      }),
      prisma.customer.create({
        data: {
          name: 'Maria Garcia',
          email: 'maria.garcia@email.com',
          phone: '+1-555-1004'
        }
      }),
      prisma.customer.create({
        data: {
          name: 'David Brown',
          email: 'david.brown@email.com',
          phone: '+1-555-1005'
        }
      })
    ]);

    console.log(`✓ Created ${customers.length} customers\n`);

    // Create Cancellation Rules
    console.log('Creating cancellation rules...');

    await prisma.cancellationRule.create({
      data: {
        name: 'Standard 24-Hour Policy',
        hoursBeforeStart: 24,
        penaltyPercentage: 50
      }
    });

    await prisma.cancellationRule.create({
      data: {
        name: 'Strict 48-Hour Policy',
        hoursBeforeStart: 48,
        penaltyPercentage: 75
      }
    });

    console.log('✓ Created cancellation rules\n');

    // Create Sample Appointments
    console.log('Creating sample appointments...');

    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);

    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);
    nextWeek.setHours(14, 0, 0, 0);

    await prisma.appointment.create({
      data: {
        resourceId: doctor1.id,
        customerId: customers[0].id,
        startTime: tomorrow,
        endTime: new Date(tomorrow.getTime() + 30 * 60000),
        status: 'CONFIRMED',
        notes: 'Annual checkup'
      }
    });

    await prisma.appointment.create({
      data: {
        resourceId: barber1.id,
        customerId: customers[1].id,
        startTime: nextWeek,
        endTime: new Date(nextWeek.getTime() + 45 * 60000),
        status: 'CONFIRMED',
        notes: 'Haircut and styling'
      }
    });

    console.log('✓ Created sample appointments\n');

    // Print summary
    console.log('═══════════════════════════════════════════════════');
    console.log('✓ Database seeding completed successfully!');
    console.log('═══════════════════════════════════════════════════');
    console.log('\nCreated:');
    console.log(`  - 4 Resources (2 Doctors, 1 Barber, 1 Technician)`);
    console.log(`  - 18 Schedules`);
    console.log(`  - 5 Customers`);
    console.log(`  - 2 Cancellation Rules`);
    console.log(`  - 2 Sample Appointments`);
    console.log('\nResource IDs:');
    console.log(`  Dr. Sarah Johnson: ${doctor1.id}`);
    console.log(`  Dr. Michael Chen:  ${doctor2.id}`);
    console.log(`  Mike Stevens:      ${barber1.id}`);
    console.log(`  Emily Rodriguez:   ${technician1.id}`);
    console.log('\nYou can now start using the API!');
    console.log('Try: curl http://localhost:3000/api/resources\n');

  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
