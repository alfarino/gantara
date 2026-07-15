'use client';
import { useState } from 'react';

export function useQrScanner() {
  const [active, setActive] = useState(false);
  return { active, setActive };
}
