import { Dispatch, useState, useEffect } from 'react';
import { LocalStorage } from '../../utils/LocalStorage';

export default function useLocalStorage<T>(
  key: keyof typeof LocalStorage,
  initialValue: T,
): [T, Dispatch<T>] {
  const [item, setValue] = useState(initialValue);

  const setItem = (newValue: T) => {
    setValue(newValue);
    LocalStorage[key] = newValue;
  };

  useEffect(() => {
    setValue((LocalStorage[key] as any) || initialValue);

    const timeout = setInterval(() => {
      const newValue = LocalStorage[key];

      if (newValue !== item) {
        setValue(newValue as any);
      }
    }, 1000);

    return () => clearInterval(timeout);
  });

  return [item, setItem];
}