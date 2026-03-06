
export interface Ponto {
  nome: string;
  lat: number;
  lng: number;
}

export interface Circuito {
  id: number;
  nome: string;
  centro: {
    lat: number;
    lng: number;
  };
  tempo_max_sem_corrida: number;
  pontos: Ponto[];
}

export const circuitos: Circuito[] = [
  {
    id: 1,
    nome: "Liberdade",
    centro: { lat: -23.5556, lng: -46.6358 },
    tempo_max_sem_corrida: 15,
    pontos: [
      { nome: "Praça da Liberdade", lat: -23.5556, lng: -46.6358 },
      { nome: "Hospital Leforte Liberdade", lat: -23.5580, lng: -46.6347 },
      { nome: "Fórum João Mendes", lat: -23.5573, lng: -46.6381 },
      { nome: "Viaduto Brigadeiro Luís Antônio", lat: -23.5544, lng: -46.6376 }
    ]
  },
  {
    id: 2,
    nome: "Sé",
    centro: { lat: -23.5505, lng: -46.6333 },
    tempo_max_sem_corrida: 15,
    pontos: [
      { nome: "Catedral da Sé", lat: -23.5505, lng: -46.6333 },
      { nome: "Pátio do Colégio", lat: -23.5481, lng: -46.6331 },
      { nome: "Tribunal de Justiça", lat: -23.5515, lng: -46.6345 },
      { nome: "Praça João Mendes", lat: -23.5525, lng: -46.6355 }
    ]
  },
  {
    id: 3,
    nome: "República",
    centro: { lat: -23.5456, lng: -46.6425 },
    tempo_max_sem_corrida: 15,
    pontos: [
      { nome: "Edifício Copan", lat: -23.5464, lng: -46.6447 },
      { nome: "Praça da República", lat: -23.5456, lng: -46.6425 },
      { nome: "Largo do Arouche", lat: -23.5428, lng: -46.6442 },
      { nome: "Av São Luís", lat: -23.5475, lng: -46.6435 }
    ]
  },
  {
    id: 4,
    nome: "Frei Caneca",
    centro: { lat: -23.5558, lng: -46.6523 },
    tempo_max_sem_corrida: 15,
    pontos: [
      { nome: "Shopping Frei Caneca", lat: -23.5558, lng: -46.6523 },
      { nome: "Universidade Mackenzie", lat: -23.5478, lng: -46.6515 },
      { nome: "Hospital Sírio Libanês", lat: -23.5565, lng: -46.6555 },
      { nome: "Rua Augusta Peixoto Gomide", lat: -23.5585, lng: -46.6545 }
    ]
  },
  {
    id: 5,
    nome: "Paulista",
    centro: { lat: -23.5614, lng: -46.6559 },
    tempo_max_sem_corrida: 15,
    pontos: [
      { nome: "MASP", lat: -23.5614, lng: -46.6559 },
      { nome: "Hospital 9 de Julho", lat: -23.5595, lng: -46.6585 },
      { nome: "Hotel Renaissance", lat: -23.5585, lng: -46.6615 },
      { nome: "Conjunto Nacional", lat: -23.5575, lng: -46.6605 }
    ]
  },
  {
    id: 6,
    nome: "Hospital das Clínicas",
    centro: { lat: -23.5571, lng: -46.6683 },
    tempo_max_sem_corrida: 15,
    pontos: [
      { nome: "Hospital das Clínicas", lat: -23.5571, lng: -46.6683 },
      { nome: "INCOR", lat: -23.5585, lng: -46.6675 },
      { nome: "Rebouças Oscar Freire", lat: -23.5625, lng: -46.6705 },
      { nome: "Estação Clínicas", lat: -23.5555, lng: -46.6665 }
    ]
  },
  {
    id: 7,
    nome: "Higienópolis",
    centro: { lat: -23.5425, lng: -46.6576 },
    tempo_max_sem_corrida: 15,
    pontos: [
      { nome: "Shopping Higienópolis", lat: -23.5425, lng: -46.6576 },
      { nome: "Hospital Samaritano", lat: -23.5385, lng: -46.6615 },
      { nome: "FAAP", lat: -23.5465, lng: -46.6605 },
      { nome: "Av Angélica Maranhão", lat: -23.5405, lng: -46.6555 }
    ]
  },
  {
    id: 8,
    nome: "Barra Funda",
    centro: { lat: -23.5255, lng: -46.6677 },
    tempo_max_sem_corrida: 15,
    pontos: [
      { nome: "Terminal Barra Funda", lat: -23.5255, lng: -46.6677 },
      { nome: "Memorial América Latina", lat: -23.5275, lng: -46.6645 },
      { nome: "UNINOVE", lat: -23.5295, lng: -46.6695 },
      { nome: "Av Pacaembu", lat: -23.5325, lng: -46.6655 }
    ]
  },
  {
    id: 9,
    nome: "Pinheiros",
    centro: { lat: -23.5673, lng: -46.6931 },
    tempo_max_sem_corrida: 15,
    pontos: [
      { nome: "Largo da Batata", lat: -23.5673, lng: -46.6931 },
      { nome: "Rua dos Pinheiros", lat: -23.5655, lng: -46.6885 },
      { nome: "Shopping Eldorado", lat: -23.5725, lng: -46.6965 },
      { nome: "Estação Faria Lima", lat: -23.5685, lng: -46.6915 }
    ]
  },
  {
    id: 10,
    nome: "Faria Lima",
    centro: { lat: -23.5753, lng: -46.6891 },
    tempo_max_sem_corrida: 15,
    pontos: [
      { nome: "Faria Lima JK", lat: -23.5895, lng: -46.6825 },
      { nome: "Shopping Iguatemi", lat: -23.5753, lng: -46.6891 },
      { nome: "Cidade Jardim", lat: -23.5825, lng: -46.6945 },
      { nome: "Rua Tabapuã", lat: -23.5835, lng: -46.6785 }
    ]
  },
  {
    id: 11,
    nome: "Berrini",
    centro: { lat: -23.6090, lng: -46.6934 },
    tempo_max_sem_corrida: 15,
    pontos: [
      { nome: "Estação Berrini", lat: -23.6090, lng: -46.6934 },
      { nome: "WTC", lat: -23.6085, lng: -46.6965 },
      { nome: "Shopping D&D", lat: -23.6105, lng: -46.6975 },
      { nome: "Av Roberto Marinho", lat: -23.6155, lng: -46.6925 }
    ]
  },
  {
    id: 12,
    nome: "Vila Olímpia",
    centro: { lat: -23.5950, lng: -46.6845 },
    tempo_max_sem_corrida: 15,
    pontos: [
      { nome: "Shopping Vila Olímpia", lat: -23.5950, lng: -46.6845 },
      { nome: "Insper", lat: -23.5985, lng: -46.6785 },
      { nome: "Av Faria Lima", lat: -23.5925, lng: -46.6855 },
      { nome: "Rua Funchal", lat: -23.5945, lng: -46.6875 }
    ]
  },
  {
    id: 13,
    nome: "Itaim Bibi",
    centro: { lat: -23.5845, lng: -46.6755 },
    tempo_max_sem_corrida: 15,
    pontos: [
      { nome: "Av JK", lat: -23.5885, lng: -46.6815 },
      { nome: "Rua João Cachoeira", lat: -23.5855, lng: -46.6775 },
      { nome: "Av Santo Amaro", lat: -23.5825, lng: -46.6735 },
      { nome: "Rua Tabapuã", lat: -23.5835, lng: -46.6785 }
    ]
  },
  {
    id: 14,
    nome: "Moema",
    centro: { lat: -23.6034, lng: -46.6635 },
    tempo_max_sem_corrida: 15,
    pontos: [
      { nome: "Shopping Ibirapuera", lat: -23.6105, lng: -46.6665 },
      { nome: "Av Ibirapuera", lat: -23.6034, lng: -46.6635 },
      { nome: "Estação Moema", lat: -23.5985, lng: -46.6615 },
      { nome: "Hospital Alvorada", lat: -23.6015, lng: -46.6605 }
    ]
  },
  {
    id: 15,
    nome: "Paraíso",
    centro: { lat: -23.5740, lng: -46.6407 },
    tempo_max_sem_corrida: 15,
    pontos: [
      { nome: "Estação Paraíso", lat: -23.5740, lng: -46.6407 },
      { nome: "Hospital Hcor", lat: -23.5725, lng: -46.6425 },
      { nome: "Av Paulista", lat: -23.5715, lng: -46.6445 },
      { nome: "23 de Maio", lat: -23.5765, lng: -46.6415 }
    ]
  },
  {
    id: 16,
    nome: "Aclimação",
    centro: { lat: -23.5666, lng: -46.6292 },
    tempo_max_sem_corrida: 15,
    pontos: [
      { nome: "Parque Aclimação", lat: -23.5735, lng: -46.6285 },
      { nome: "Hospital AC Camargo", lat: -23.5666, lng: -46.6292 },
      { nome: "Av Lins de Vasconcelos", lat: -23.5685, lng: -46.6245 },
      { nome: "Rua Muniz de Souza", lat: -23.5715, lng: -46.6265 }
    ]
  },
  {
    id: 17,
    nome: "Bela Vista",
    centro: { lat: -23.5550, lng: -46.6475 },
    tempo_max_sem_corrida: 15,
    pontos: [
      { nome: "Hospital Sírio Libanês", lat: -23.5565, lng: -46.6555 },
      { nome: "9 de Julho", lat: -23.5585, lng: -46.6525 },
      { nome: "Rua Treze de Maio", lat: -23.5595, lng: -46.6445 },
      { nome: "Av Brigadeiro Luís Antônio", lat: -23.5550, lng: -46.6475 }
    ]
  },
  {
    id: 18,
    nome: "Consolação",
    centro: { lat: -23.5535, lng: -46.6570 },
    tempo_max_sem_corrida: 15,
    pontos: [
      { nome: "Rua Augusta", lat: -23.5585, lng: -46.6605 },
      { nome: "Hospital Sírio", lat: -23.5565, lng: -46.6555 },
      { nome: "Mackenzie", lat: -23.5478, lng: -46.6515 },
      { nome: "Av Paulista", lat: -23.5535, lng: -46.6570 }
    ]
  },
  {
    id: 19,
    nome: "Jardins",
    centro: { lat: -23.5700, lng: -46.6600 },
    tempo_max_sem_corrida: 15,
    pontos: [
      { nome: "Oscar Freire", lat: -23.5665, lng: -46.6685 },
      { nome: "Hospital das Clínicas", lat: -23.5571, lng: -46.6683 },
      { nome: "Hotel Emiliano", lat: -23.5655, lng: -46.6675 },
      { nome: "Rua Bela Cintra", lat: -23.5625, lng: -46.6635 }
    ]
  },
  {
    id: 20,
    nome: "Perdizes",
    centro: { lat: -23.5370, lng: -46.6730 },
    tempo_max_sem_corrida: 15,
    pontos: [
      { nome: "PUC", lat: -23.5385, lng: -46.6715 },
      { nome: "Hospital São Camilo", lat: -23.5345, lng: -46.6795 },
      { nome: "Av Sumaré", lat: -23.5370, lng: -46.6730 },
      { nome: "Allianz Parque", lat: -23.5275, lng: -46.6785 }
    ]
  },
  {
    id: 21,
    nome: "Tatuapé",
    centro: { lat: -23.5409, lng: -46.5764 },
    tempo_max_sem_corrida: 15,
    pontos: [
      { nome: "Shopping Tatuapé", lat: -23.5409, lng: -46.5764 },
      { nome: "Shopping Boulevard", lat: -23.5395, lng: -46.5745 },
      { nome: "Estação Tatuapé", lat: -23.5405, lng: -46.5755 },
      { nome: "Rua Itapura", lat: -23.5455, lng: -46.5705 }
    ]
  },
  {
    id: 22,
    nome: "Santana",
    centro: { lat: -23.5035, lng: -46.6250 },
    tempo_max_sem_corrida: 15,
    pontos: [
      { nome: "Shopping Santana Park", lat: -23.4915, lng: -46.6455 },
      { nome: "Estação Santana", lat: -23.5035, lng: -46.6250 },
      { nome: "Av Braz Leme", lat: -23.5085, lng: -46.6355 },
      { nome: "Hospital São Camilo Santana", lat: -23.4985, lng: -46.6305 }
    ]
  },
  {
    id: 23,
    nome: "Brooklin",
    centro: { lat: -23.6175, lng: -46.6880 },
    tempo_max_sem_corrida: 15,
    pontos: [
      { nome: "Estação Brooklin", lat: -23.6265, lng: -46.6885 },
      { nome: "Av Santo Amaro", lat: -23.6175, lng: -46.6880 },
      { nome: "Av Berrini", lat: -23.6090, lng: -46.6934 },
      { nome: "Av Roberto Marinho", lat: -23.6155, lng: -46.6925 }
    ]
  },
  {
    id: 24,
    nome: "Campo Belo",
    centro: { lat: -23.6265, lng: -46.6745 },
    tempo_max_sem_corrida: 15,
    pontos: [
      { nome: "Estação Campo Belo", lat: -23.6265, lng: -46.6745 },
      { nome: "Av Vieira de Morais", lat: -23.6235, lng: -46.6715 },
      { nome: "Rua Pascal", lat: -23.6215, lng: -46.6765 },
      { nome: "Av Santo Amaro", lat: -23.6285, lng: -46.6785 }
    ]
  },
  {
    id: 25,
    nome: "Saúde",
    centro: { lat: -23.6125, lng: -46.6360 },
    tempo_max_sem_corrida: 15,
    pontos: [
      { nome: "Estação Saúde", lat: -23.6125, lng: -46.6360 },
      { nome: "Hospital São Luiz", lat: -23.6185, lng: -46.6325 },
      { nome: "Av Jabaquara", lat: -23.6155, lng: -46.6385 },
      { nome: "Shopping Plaza Sul", lat: -23.6255, lng: -46.6315 }
    ]
  },
  {
    id: 26,
    nome: "Vila Mariana",
    centro: { lat: -23.5880, lng: -46.6340 },
    tempo_max_sem_corrida: 15,
    pontos: [
      { nome: "Estação Vila Mariana", lat: -23.5880, lng: -46.6340 },
      { nome: "Hospital São Paulo", lat: -23.5965, lng: -46.6415 },
      { nome: "UNIFESP", lat: -23.5975, lng: -46.6425 },
      { nome: "Rua Domingos de Morais", lat: -23.5925, lng: -46.6365 }
    ]
  },
  {
    id: 27,
    nome: "Ibirapuera",
    centro: { lat: -23.5870, lng: -46.6570 },
    tempo_max_sem_corrida: 15,
    pontos: [
      { nome: "Parque Ibirapuera", lat: -23.5870, lng: -46.6570 },
      { nome: "Hospital Dante Pazzanese", lat: -23.5915, lng: -46.6525 },
      { nome: "Av República do Líbano", lat: -23.5895, lng: -46.6625 },
      { nome: "Av Ibirapuera", lat: -23.6034, lng: -46.6635 }
    ]
  },
  {
    id: 28,
    nome: "Cambuci",
    centro: { lat: -23.5675, lng: -46.6205 },
    tempo_max_sem_corrida: 15,
    pontos: [
      { nome: "Hospital Cruz Azul", lat: -23.5685, lng: -46.6185 },
      { nome: "Av Lins de Vasconcelos", lat: -23.5685, lng: -46.6245 },
      { nome: "Av do Estado", lat: -23.5655, lng: -46.6155 },
      { nome: "Rua Clímaco Barbosa", lat: -23.5675, lng: -46.6205 }
    ]
  },
  {
    id: 29,
    nome: "Santa Cecília",
    centro: { lat: -23.5360, lng: -46.6480 },
    tempo_max_sem_corrida: 15,
    pontos: [
      { nome: "Estação Santa Cecília", lat: -23.5360, lng: -46.6480 },
      { nome: "Hospital Samaritano", lat: -23.5385, lng: -46.6615 },
      { nome: "Av São João", lat: -23.5345, lng: -46.6455 },
      { nome: "Largo Santa Cecília", lat: -23.5355, lng: -46.6475 }
    ]
  },
  {
    id: 30,
    nome: "Anhangabaú",
    centro: { lat: -23.5489, lng: -46.6388 },
    tempo_max_sem_corrida: 15,
    pontos: [
      { nome: "Vale do Anhangabaú", lat: -23.5489, lng: -46.6388 },
      { nome: "Theatro Municipal", lat: -23.5455, lng: -46.6395 },
      { nome: "Terminal Bandeira", lat: -23.5505, lng: -46.6415 },
      { nome: "Rua Líbero Badaró", lat: -23.5475, lng: -46.6375 }
    ]
  }
];
