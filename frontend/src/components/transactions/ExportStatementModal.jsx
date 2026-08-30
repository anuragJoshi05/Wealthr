import { useState } from 'react';
import { FileDown, Lock, Mail, CheckCircle2 } from 'lucide-react';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Button from '../common/Button';
import { transactionService } from '../../services/transactionService';
import { generateStatementPdf, generateStatementPdfBase64, statementFilename } from '../../utils/pdfExport';
import { emailStatement } from '../../services/statementEmailService';
import { getApiErrorMessage } from '../../services/api';
import { notify } from '../../utils/toast';
import { useAuth } from '../../contexts/AuthContext';
import { toInputDate } from '../../utils/formatters';

function firstOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

export default function ExportStatementModal({ open, onClose }) {
  const { user } = useAuth();
  const [startDate, setStartDate] = useState(firstOfMonth());
  const [endDate, setEndDate] = useState(toInputDate());
  const [generating, setGenerating] = useState(false);
  const [emailing, setEmailing] = useState(false);
  const [emailedTo, setEmailedTo] = useState(null);

  function validRange() {
    if (new Date(startDate) > new Date(endDate)) {
      notify.error('Start date must be before end date');
      return false;
    }
    return true;
  }

  async function handleDownload() {
    if (!validRange()) return;
    setGenerating(true);
    try {
      const transactions = await transactionService.listAllInRange(startDate, `${endDate}T23:59:59.999Z`);
      generateStatementPdf({
        userName: user?.displayName,
        userEmail: user?.email,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        transactions,
      });
      notify.success('Statement downloaded');
      onClose();
    } catch (err) {
      notify.error(getApiErrorMessage(err));
    } finally {
      setGenerating(false);
    }
  }

  async function handleEmail() {
    if (!validRange()) return;
    setEmailing(true);
    setEmailedTo(null);
    try {
      const isoStart = new Date(startDate).toISOString();
      const isoEnd = new Date(endDate).toISOString();
      const transactions = await transactionService.listAllInRange(startDate, `${endDate}T23:59:59.999Z`);
      const pdfBase64 = generateStatementPdfBase64({
        userName: user?.displayName,
        userEmail: user?.email,
        startDate: isoStart,
        endDate: isoEnd,
        transactions,
      });
      const result = await emailStatement({
        pdfBase64,
        filename: statementFilename(isoStart, isoEnd),
        startDate: isoStart,
        endDate: isoEnd,
      });
      setEmailedTo(result?.sentTo || user?.email);
      notify.success('Statement emailed');
    } catch (err) {
      notify.error(err.message || getApiErrorMessage(err));
    } finally {
      setEmailing(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Export Statement" size="sm">
      <div className="space-y-4">
        <p className="text-sm text-ink-500 dark:text-ink-400">
          Generates a formal PDF statement of every transaction in the selected range, ready to save, print, or
          email to yourself.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Input label="From" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <Input label="To" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>

        <div className="flex items-start gap-2.5 rounded-xl bg-ink-50 dark:bg-ink-800/60 border border-ink-100 dark:border-ink-800 px-3.5 py-3">
          <Lock size={15} className="text-ink-400 mt-0.5 shrink-0" />
          <p className="text-xs text-ink-500 dark:text-ink-400 leading-relaxed">
            Every statement is password protected. Use your account email —{' '}
            <span className="font-semibold text-ink-700 dark:text-ink-200">{user?.email}</span> — to open it.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5">
          <Button fullWidth loading={generating} disabled={emailing} onClick={handleDownload}>
            <FileDown size={16} /> Download PDF
          </Button>
          <Button fullWidth variant="secondary" loading={emailing} disabled={generating} onClick={handleEmail}>
            <Mail size={16} /> Email me a copy
          </Button>
        </div>

        {emailedTo && (
          <div className="flex items-center gap-2 text-xs text-income-DEFAULT dark:text-income-dark">
            <CheckCircle2 size={14} />
            Sent to {emailedTo}
          </div>
        )}
      </div>
    </Modal>
  );
}
