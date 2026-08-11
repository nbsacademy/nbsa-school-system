'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import imageCompression from 'browser-image-compression';

export default function AddAccountPage() {
  const [method, setMethod] = useState('Easypaisa');
  const [title, setTitle] = useState('');
  const [number, setNumber] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);

  useEffect(() => { fetchAccounts(); }, []);

  const fetchAccounts = async () => {
    const { data } = await supabase.from('payment_accounts').select('*').order('created_at', { ascending: false });
    setAccounts(data || []);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return alert('Please select QR code image');
    setLoading(true);

    try {
      // 1. Compress Image to 50KB
      const options = { maxSizeMB: 0.05, maxWidthOrHeight: 800, useWebWorker: true };
      const compressedFile = await imageCompression(file, options);

      // 2. Upload to Storage
      const fileName = `qr/${Date.now()}_${compressedFile.name}`;
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('qr-codes')
        .upload(fileName, compressedFile);
      
      if (uploadErr) throw uploadErr;

      // 3. Get Public URL
      const { data: pubData } = supabase.storage.from('qr-codes').getPublicUrl(fileName);

      // 4. Save to DB
      await supabase.from('payment_accounts').insert({
        method, account_title: title, account_number: number, qr_url: pubData.publicUrl
      });

      alert('Account added successfully!');
      setTitle(''); setNumber(''); setFile(null); fetchAccounts();
    } catch (err) {
      alert('Error saving account: ' + err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-3xl shadow-sm border">
        <h2 className="text-xl font-black text-blue-950 mb-4">Add Payment Account</h2>
        <form onSubmit={handleUpload} className="space-y-4">
          <select value={method} onChange={(e) => setMethod(e.target.value)} className="w-full p-3 border rounded-xl font-bold">
            <option>Easypaisa</option><option>JazzCash</option><option>Bank Account</option><option>Raast ID</option>
          </select>
          <input type="text" placeholder="Account Title" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-3 border rounded-xl" required />
          <input type="text" placeholder="Account Number" value={number} onChange={(e) => setNumber(e.target.value)} className="w-full p-3 border rounded-xl" required />
          <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)} className="w-full p-2 border rounded-xl" required />
          
          <button disabled={loading} className="w-full py-3 bg-blue-950 text-white font-black rounded-xl">
            {loading ? 'Compressing & Saving...' : 'Save Account'}
          </button>
        </form>
      </div>

      <div className="space-y-4">
        <h3 className="font-black text-blue-950">Saved Accounts</h3>
        {accounts.map((acc) => (
          <div key={acc.id} className="bg-white p-4 rounded-2xl border flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <img src={acc.qr_url} alt="QR" className="w-12 h-12 rounded-lg object-cover" />
              <div>
                <p className="font-black text-sm">{acc.account_title}</p>
                <p className="text-xs text-gray-500 font-mono">{acc.method} - {acc.account_number}</p>
              </div>
            </div>
            <button onClick={async() => { await supabase.from('payment_accounts').delete().eq('id', acc.id); fetchAccounts(); }} className="text-rose-600 font-bold text-xs">Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}