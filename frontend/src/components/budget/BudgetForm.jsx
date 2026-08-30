import { useState } from 'react';
import Input from '../common/Input';
import Select from '../common/Select';
import Button from '../common/Button';
import { EXPENSE_CATEGORIES } from '../../utils/constants';
import { currentMonthKey } from '../../utils/formatters';
import { budgetService } from '../../services/budgetService';
import { getApiErrorMessage } from '../../services/api';
import { notify } from '../../utils/toast';
import { emitDataChanged } from '../../utils/events';

export default function BudgetForm({ month = currentMonthKey(), onDone, onCancel }) {
  const [category, setCategory] = useState('');
  const [limit, setLimit] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = {};
    if (!category) errs.category = 'Select a category';
    if (!limit || Number(limit) <= 0) errs.limit = 'Enter a valid amount';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSubmitting(true);
    try {
      await budgetService.create({ category, month, limit: Number(limit) });
      notify.success('Budget created');
      emitDataChanged('all');
      onDone?.();
    } catch (err) {
      notify.error(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Select label="Category" value={category} onChange={(e) => setCategory(e.target.value)} error={errors.category}>
        <option value="">Select category</option>
        {EXPENSE_CATEGORIES.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </Select>
      <Input
        label="Monthly Limit"
        type="number"
        inputMode="decimal"
        step="0.01"
        min="0"
        placeholder="0.00"
        value={limit}
        onChange={(e) => setLimit(e.target.value)}
        error={errors.limit}
      />
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" fullWidth onClick={onCancel}>Cancel</Button>
        <Button type="submit" fullWidth loading={submitting}>Create Budget</Button>
      </div>
    </form>
  );
}
