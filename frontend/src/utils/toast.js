import toast from 'react-hot-toast';

const base = {
  style: {
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: 500,
  },
};

export const notify = {
  success: (msg) => toast.success(msg, { ...base }),
  error: (msg) => toast.error(msg, { ...base, duration: 4000 }),
  info: (msg) => toast(msg, { ...base }),
};
