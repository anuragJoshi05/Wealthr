import { useState } from 'react';
import TransactionList from '../components/transactions/TransactionList';

export default function Transactions({ onEditTransaction, search }) {
  return (
    <div>
      <TransactionList search={search} onEdit={onEditTransaction} />
    </div>
  );
}
