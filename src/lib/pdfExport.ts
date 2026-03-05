import jsPDF from "jspdf";
import "jspdf-autotable";

interface DailyRecord {
  date: string;
  total_faturamento: number;
  total_gastos_variaveis: number;
  lucro_bruto: number;
  lucro_liquido: number;
  km_total: number;
  tempo_ativo_segundos: number;
  media_hora_liquida: number;
  gasto_combustivel: number;
  gasto_alimentacao: number;
  gasto_outros: number;
  provisao_ipva_diaria: number;
  provisao_manutencao_diaria: number;
  provisao_seguro_diaria: number;
  custo_financiamento_diario: number;
  uber_rides: number;
  uber_amount: number;
  ninety_nine_rides: number;
  ninety_nine_amount: number;
  indrive_rides: number;
  indrive_amount: number;
  private_rides: number;
  private_amount: number;
}

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatHours = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
};

export function generatePDFReport(
  records: DailyRecord[],
  userName: string,
  period: string
) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 20;

  // Header
  doc.setFontSize(24);
  doc.setTextColor(37, 99, 235); // Primary color
  doc.text("Motorista no Lucro", 20, yPosition);
  yPosition += 10;

  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text(`Relatório de ${period}`, 20, yPosition);
  yPosition += 8;

  doc.setFontSize(10);
  doc.setTextColor(150, 150, 150);
  doc.text(`Motorista: ${userName}`, 20, yPosition);
  doc.text(`Data: ${new Date().toLocaleDateString("pt-BR")}`, pageWidth - 60, yPosition);
  yPosition += 12;

  // Summary Section
  const totalFaturamento = records.reduce((s, r) => s + r.total_faturamento, 0);
  const totalGastos = records.reduce((s, r) => s + r.total_gastos_variaveis, 0);
  const totalLucro = records.reduce((s, r) => s + r.lucro_liquido, 0);
  const totalKm = records.reduce((s, r) => s + r.km_total, 0);
  const totalHoras = records.reduce((s, r) => s + r.tempo_ativo_segundos, 0);
  const mediaHora = totalHoras > 0 ? totalLucro / (totalHoras / 3600) : 0;

  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text("RESUMO EXECUTIVO", 20, yPosition);
  yPosition += 8;

  const summaryData = [
    ["Faturamento Total", fmt(totalFaturamento)],
    ["Gastos Variáveis", fmt(totalGastos)],
    ["Lucro Líquido", fmt(totalLucro)],
    ["Km Rodados", totalKm.toLocaleString("pt-BR")],
    ["Horas de Trabalho", formatHours(totalHoras)],
    ["Lucro Médio/Hora", fmt(mediaHora)],
  ];

  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  summaryData.forEach((row) => {
    doc.text(row[0], 20, yPosition);
    doc.text(row[1], pageWidth - 60, yPosition, { align: "right" });
    yPosition += 6;
  });

  yPosition += 6;

  // Detailed Records Table
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text("DETALHAMENTO DIÁRIO", 20, yPosition);
  yPosition += 8;

  const tableData = records.map((r) => [
    new Date(r.date).toLocaleDateString("pt-BR"),
    fmt(r.total_faturamento),
    fmt(r.total_gastos_variaveis),
    fmt(r.lucro_liquido),
    r.km_total.toLocaleString("pt-BR"),
    formatHours(r.tempo_ativo_segundos),
    fmt(r.media_hora_liquida),
  ]);

  (doc as any).autoTable({
    startY: yPosition,
    head: [
      [
        "Data",
        "Faturamento",
        "Gastos",
        "Lucro",
        "KM",
        "Horas",
        "Lucro/h",
      ],
    ],
    body: tableData,
    theme: "grid",
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [60, 60, 60],
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    margin: { left: 20, right: 20 },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 12;

  // Breakdown by Platform
  if (yPosition > pageHeight - 60) {
    doc.addPage();
    yPosition = 20;
  }

  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text("FATURAMENTO POR PLATAFORMA", 20, yPosition);
  yPosition += 8;

  const platformData = [
    [
      "Uber",
      records.reduce((s, r) => s + r.uber_rides, 0),
      fmt(records.reduce((s, r) => s + r.uber_amount, 0)),
    ],
    [
      "99",
      records.reduce((s, r) => s + r.ninety_nine_rides, 0),
      fmt(records.reduce((s, r) => s + r.ninety_nine_amount, 0)),
    ],
    [
      "InDrive",
      records.reduce((s, r) => s + r.indrive_rides, 0),
      fmt(records.reduce((s, r) => s + r.indrive_amount, 0)),
    ],
    [
      "Privado",
      records.reduce((s, r) => s + r.private_rides, 0),
      fmt(records.reduce((s, r) => s + r.private_amount, 0)),
    ],
  ];

  (doc as any).autoTable({
    startY: yPosition,
    head: [["Plataforma", "Corridas", "Faturamento"]],
    body: platformData,
    theme: "grid",
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [60, 60, 60],
    },
    margin: { left: 20, right: 20 },
  });

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(
    "Relatório gerado automaticamente pelo Motorista no Lucro",
    pageWidth / 2,
    pageHeight - 10,
    { align: "center" }
  );

  // Save
  const fileName = `relatorio_${period.toLowerCase().replace(/\s/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`;
  doc.save(fileName);
}
