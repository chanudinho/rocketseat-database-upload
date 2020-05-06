import { getRepository, In } from 'typeorm';
import path from 'path';
import fs from 'fs';
import csvParse from 'csv-parse';

import Transaction from '../models/Transaction';
import Category from '../models/Category';
import uploadConfig from '../config/upload';
import AppError from '../errors/AppError';

interface Request {
  mimetype: string;
  filename: string;
}

interface TransactionCSV {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

async function loadCSV(csvFilenane: string): Promise<TransactionCSV[]> {
  const readCSVStream = fs.createReadStream(csvFilenane);

  const parseStream = csvParse({
    from_line: 2,
    ltrim: true,
    rtrim: true,
  });

  const parseCSV = readCSVStream.pipe(parseStream);

  const transaction: TransactionCSV[] = [];

  parseCSV.on('data', line => {
    const [title, type, value, category] = line.map(
      (element: string) => element,
    );

    if (!title || !type || !value) return;

    transaction.push({ title, type, value, category });
  });

  await new Promise(resolve => {
    parseCSV.on('end', resolve);
  });

  return transaction;
}

class ImportTransactionsService {
  async execute({ mimetype, filename }: Request): Promise<Transaction[]> {
    const transactionRepository = getRepository(Transaction);
    const categoryRepository = getRepository(Category);

    const filePath = path.join(uploadConfig.directory, filename);

    if (mimetype !== 'text/csv') {
      await fs.promises.unlink(filePath);

      throw new AppError('The file format is not supported', 400);
    }

    const transactionCsv = await loadCSV(filePath);

    const categories = transactionCsv.map(transaction => transaction.category);

    const categoriesNoRepetition = categories.filter(
      (category, index, array) =>
        array.indexOf(category) === index && category !== '',
    );

    const existCategories = await categoryRepository.find({
      where: {
        title: In(categoriesNoRepetition),
      },
    });

    const existCategoriesTitle = existCategories.map(
      category => category.title,
    );

    const addCategories = categoriesNoRepetition.filter(
      category => existCategoriesTitle.indexOf(category) === -1,
    );

    const createCategories = addCategories.map(title => {
      return categoryRepository.create({
        title,
      });
    });

    await categoryRepository.save(createCategories);

    const finalCategories = categories.map(category => {
      const index = addCategories.indexOf(category);
      if (index !== -1) {
        return createCategories[index];
      }
      return existCategories[existCategoriesTitle.indexOf(category)];
    });

    const transactions = transactionCsv.map((transaction, index) => {
      return transactionRepository.create({
        title: transaction.title,
        type: transaction.type,
        value: transaction.value,
        category: finalCategories[index],
      });
    });

    await transactionRepository.save(transactions);

    await fs.promises.unlink(filePath);

    return transactions;
  }
}

export default ImportTransactionsService;
