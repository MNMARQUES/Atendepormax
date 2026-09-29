import { useState, useEffect } from 'react';
import api from '../services/api';

export function useFotoContato(telefone: string | null | undefined) {
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!telefone) {
      setFotoUrl(null);
      return;
    }

    // normaliza: remove tudo que não é dígito
    const numero = telefone.replace(/\D/g, '');
    let cancelled = false;

    api.get(`/whatsapp/foto/${numero}`)
      .then((r) => {
        if (!cancelled) setFotoUrl(r.data?.pictureUrl || null);
      })
      .catch(() => {
        if (!cancelled) setFotoUrl(null);
      });

    return () => {
      cancelled = true;
    };
  }, [telefone]);

  return fotoUrl;
}

export default useFotoContato;
