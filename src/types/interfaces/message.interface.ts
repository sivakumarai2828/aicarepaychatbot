export interface Message {
  id: string;
  text: string;
  sender: 'bot' | 'user';
  timestamp: Date;
  metadata?: {
    type?: string;
    bills?: any[];
    [key: string]: any;
  };
}