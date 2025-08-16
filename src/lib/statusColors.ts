export function getStatusBadgeColor(estado?: string) {
  switch (estado?.toLowerCase()) {
    case 'confirmado': 
      return 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100';
    case 'interés': 
      return 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100';
    case 'propuesta': 
      return 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100';
    case 'cancelado': 
      return 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100';
    default: 
      return 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100';
  }
}