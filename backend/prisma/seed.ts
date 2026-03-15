import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL!;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const DEFAULT_CATEGORIES = [
  { name: 'Alimentação', icon: 'utensils', color: '#f97316' },
  { name: 'Transporte', icon: 'car', color: '#3b82f6' },
  { name: 'Moradia', icon: 'home', color: '#8b5cf6' },
  { name: 'Saúde', icon: 'heart-pulse', color: '#ef4444' },
  { name: 'Lazer', icon: 'gamepad-2', color: '#ec4899' },
  { name: 'Educação', icon: 'graduation-cap', color: '#06b6d4' },
  { name: 'Roupas', icon: 'shirt', color: '#f59e0b' },
  { name: 'Assinaturas', icon: 'credit-card', color: '#6366f1' },
  { name: 'Mercado', icon: 'shopping-cart', color: '#22c55e' },
  { name: 'Restaurante', icon: 'utensils-crossed', color: '#e11d48' },
  { name: 'Delivery', icon: 'bike', color: '#f43f5e' },
  { name: 'Contas', icon: 'file-text', color: '#64748b' },
  { name: 'Salário', icon: 'banknote', color: '#16a34a' },
  { name: 'Freelance', icon: 'laptop', color: '#0ea5e9' },
  { name: 'Investimentos', icon: 'trending-up', color: '#7c3aed' },
  { name: 'Pix', icon: 'zap', color: '#10b981' },
  { name: 'Outros', icon: 'tag', color: '#94a3b8' },
];

async function main() {
  console.log('Seeding default categories...');

  for (const cat of DEFAULT_CATEGORIES) {
    const existing = await prisma.category.findFirst({
      where: { name: cat.name, userId: null, isDefault: true },
    });
    if (!existing) {
      await prisma.category.create({
        data: { ...cat, userId: null, isDefault: true },
      });
    }
  }

  console.log(`Seeded ${DEFAULT_CATEGORIES.length} default categories.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
