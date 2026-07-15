'use client';
import { useState } from 'react';

export function useKeluarga() {
  const [loading, setLoading] = useState(false);
  return { loading };
}
