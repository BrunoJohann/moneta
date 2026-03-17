import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { TransactionsService } from './transactions.service.js';
import { CreateTransactionDto } from './dto/create-transaction.dto.js';
import { UpdateTransactionDto } from './dto/update-transaction.dto.js';
import { TransactionFiltersDto } from './dto/transaction-filters.dto.js';

interface AuthUser {
  userId: string;
  email: string;
}

type PrismaTx = {
  id: string;
  type: string;
  amount: Prisma.Decimal;
  description: string;
  categoryId: string | null;
  category?: { name: string } | null;
  date: Date;
  createdAt: Date;
};

function mapTx(tx: PrismaTx) {
  return {
    id: tx.id,
    type: tx.type.toLowerCase() as 'income' | 'expense',
    amount: tx.amount.toNumber(),
    description: tx.description,
    category: tx.category?.name ?? null,
    categoryId: tx.categoryId ?? null,
    date: tx.date.toISOString(),
    createdAt: tx.createdAt.toISOString(),
  };
}

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  async findAll(
    @CurrentUser() user: AuthUser,
    @Query() filters: TransactionFiltersDto,
  ) {
    const result = await this.transactionsService.findAllByUser(user.userId, filters);
    return { ...result, data: result.data.map(mapTx) };
  }

  @Get('summary')
  getSummary(
    @CurrentUser() user: AuthUser,
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    const now = new Date();
    return this.transactionsService.getMonthlySummary(
      user.userId,
      year ? parseInt(year, 10) : now.getFullYear(),
      month ? parseInt(month, 10) : now.getMonth() + 1,
    );
  }

  @Get('categories')
  getCategoryBreakdown(
    @CurrentUser() user: AuthUser,
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    const now = new Date();
    return this.transactionsService.getCategoryBreakdown(
      user.userId,
      year ? parseInt(year, 10) : now.getFullYear(),
      month ? parseInt(month, 10) : now.getMonth() + 1,
    );
  }

  @Get('weekly')
  getWeeklyTotals(
    @CurrentUser() user: AuthUser,
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    const now = new Date();
    return this.transactionsService.getWeeklyTotals(
      user.userId,
      year ? parseInt(year, 10) : now.getFullYear(),
      month ? parseInt(month, 10) : now.getMonth() + 1,
    );
  }

  @Get(':id')
  async findOne(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    const tx = await this.transactionsService.findById(id, user.userId);
    return mapTx(tx);
  }

  @Post()
  async create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateTransactionDto,
  ) {
    const tx = await this.transactionsService.create({ userId: user.userId, ...dto });
    return mapTx(tx);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateTransactionDto,
  ) {
    const tx = await this.transactionsService.update(id, user.userId, dto);
    return mapTx(tx);
  }

  @Delete(':id')
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.transactionsService.delete(id, user.userId);
  }
}
