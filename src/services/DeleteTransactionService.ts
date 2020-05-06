import { getRepository } from 'typeorm';

import AppError from '../errors/AppError';
import Transaction from '../models/Transaction';

class DeleteTransactionService {
  public async execute(id: string): Promise<void> {
    const transactionRepository = getRepository(Transaction);

    const transactionExist = await transactionRepository.findOne({
      where: { id },
    });

    if (!transactionExist) {
      throw new AppError('Invalid ID', 400);
    }

    await transactionRepository.delete(id);
  }
}

export default DeleteTransactionService;
