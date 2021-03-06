import { EntityRepository, Repository } from 'typeorm';

import Transaction from '../models/Transaction';

interface Balance {
  income: number;
  outcome: number;
  total: number;
}

@EntityRepository(Transaction)
class TransactionsRepository extends Repository<Transaction> {
  public async getBalance(): Promise<Balance> {
    const allTransactions = await this.find();

    const { income, outcome, total } = allTransactions.reduce(
      (accumulator, transaction) => {
        if (transaction.type === 'income') {
          accumulator.income += Number(transaction.value);
          accumulator.total += Number(transaction.value);
        } else {
          accumulator.outcome += Number(transaction.value);
          accumulator.total -= Number(transaction.value);
        }
        return accumulator;
      },
      {
        income: 0,
        outcome: 0,
        total: 0,
      },
    );

    return { income, outcome, total };
  }
}

export default TransactionsRepository;
