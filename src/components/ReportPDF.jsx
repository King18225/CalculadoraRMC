import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';

// Estilos do PDF - Layout "Grid Financeiro Limpo"
const styles = StyleSheet.create({
    page: { padding: 30, fontSize: 10, fontFamily: 'Helvetica' },

    // Header Principal
    header: {
        marginBottom: 15,
        padding: 10,
        backgroundColor: '#f8f8f8', // Cinza muito claro
        borderTop: '2px solid #000',
        borderBottom: '2px solid #000'
    },
    title: { fontSize: 14, fontWeight: 'bold', color: '#000', textTransform: 'uppercase', marginBottom: 4 },
    subtitle: { fontSize: 9, color: '#333' },

    // Seções
    section: { marginBottom: 15 },
    sectionTitle: {
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        borderBottom: '1px solid #000',
        marginBottom: 6,
        paddingBottom: 2
    },

    // Dados em Linha
    row: { flexDirection: 'row', marginBottom: 2 },
    label: { width: 110, fontSize: 8, fontWeight: 'bold' },
    value: { flex: 1, fontSize: 8 },

    // Resumo de Resultado (Highlight - Suavizado)
    resultBox: {
        backgroundColor: '#f9fafb', // Fundo bem claro
        borderTop: '1px solid #000',
        borderBottom: '1px solid #000',
        color: '#000', // Texto preto
        padding: 10,
        marginTop: 15, // Mais espaço antes do total
        marginBottom: 10
    },
    resultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    resultTitle: { fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
    resultValue: { fontSize: 16, fontWeight: 'bold' },

    // Tabela Principal
    tableContainer: { marginTop: 10 },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#f2f2f2', // CINZA CLARO SOLICITADO
        borderBottom: '1px solid #000',
        borderTop: '1px solid #000',
        paddingVertical: 6, // Padding alto
        alignItems: 'center'
    },
    // Colunas (Total 100% - Ajustado para Indexador Parc.)
    colIndex: { width: '8%', textAlign: 'center', fontSize: 7, fontWeight: 'bold' }, // Parc.
    colDate: { width: '12%', textAlign: 'center', fontSize: 7, fontWeight: 'bold' }, // Data
    colMoney: { width: '16%', textAlign: 'right', fontSize: 7, fontWeight: 'bold' }, // Geral Money

    // Tabela Row
    tableRow: {
        flexDirection: 'row',
        borderBottom: '1px solid #e0e0e0', // Linha fina
        paddingVertical: 5, // Aumentado um pouco
        alignItems: 'center',
    },
    cellText: { fontSize: 7, textAlign: 'right' },

    // Rodapé da Tabela (Totais)
    tableFooter: {
        flexDirection: 'row',
        backgroundColor: '#e0e0e0',
        borderTop: '1px solid #000',
        borderBottom: '2px solid #000',
        paddingVertical: 4,
        alignItems: 'center'
    }
});

const fmtBRL = (value) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const fmtDate = (dateString) => {
    if (!dateString) return '-';
    // Ajuste simples de timezone para evitar dia anterior
    const date = new Date(dateString);
    return new Date(date.valueOf() + date.getTimezoneOffset() * 60000).toLocaleDateString('pt-BR');
};

export const ReportPDF = ({ client, contract, summary, evolution }) => {

    // Cálculos de Totais para o Rodapé da Tabela
    const totalPago = evolution.reduce((acc, item) => acc + parseFloat(item.valorPago), 0);
    const totalAmortizado = evolution.reduce((acc, item) => acc + item.amortizacao, 0);

    return (
        <Document>
            <Page size="A4" style={styles.page}>

                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Relatório Técnico de Evolução do Saldo Devedor</Text>
                    <Text style={styles.subtitle}>Análise de Amortização - Cartão de Crédito Consignado (RMC)</Text>
                    <Text style={[styles.subtitle, { marginTop: 2 }]}>Emitido em: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}</Text>
                </View>

                {/* Dados da Parte */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>1. Dados do Contrato</Text>
                    <View style={styles.row}>
                        <Text style={styles.label}>Cliente:</Text>
                        <Text style={styles.value}>{client.nome || 'Nome não informado'}</Text>
                        <Text style={styles.label}>CPF:</Text>
                        <Text style={styles.value}>{client.cpf || '-'}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Valor Financiado:</Text>
                        <Text style={styles.value}>{fmtBRL(contract.valorOriginal)}</Text>
                        <Text style={styles.label}>Data Início:</Text>
                        <Text style={styles.value}>{fmtDate(contract.dataInicio)}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Benefício (NB):</Text>
                        <Text style={styles.value}>{client.beneficio || '-'}</Text>
                        <Text style={styles.label}></Text>
                        <Text style={styles.value}></Text>
                    </View>
                </View>

                {/* Tabela de Cálculos */}
                <View style={[styles.section, { flex: 1 }]}>
                    <Text style={styles.sectionTitle}>2. Memória de Cálculo (Evolução Mensal)</Text>

                    <View style={styles.tableContainer}>
                        {/* Cabeçalho */}
                        <View style={styles.tableHeader}>
                            <Text style={styles.colIndex}>Parc.</Text>
                            <Text style={styles.colDate}>Data</Text>
                            <Text style={styles.colMoney}>Saldo Ant.</Text>
                            <Text style={styles.colMoney}>Juros</Text>
                            <Text style={styles.colMoney}>Valor Pago</Text>
                            <Text style={[styles.colMoney, { color: '#009e2a' }]}>Amortização</Text>
                            <Text style={styles.colMoney}>Saldo Atual</Text>
                        </View>

                        {/* Linhas */}
                        {evolution.map((row, i) => (
                            <View key={row.index} style={[styles.tableRow, { backgroundColor: i % 2 !== 0 ? '#EBF5FB' : '#FFFFFF' }]}>
                                <Text style={[styles.colIndex, styles.cellText, { textAlign: 'center' }]}>{row.index}</Text>
                                <Text style={[styles.colDate, styles.cellText, { textAlign: 'center' }]}>{fmtDate(row.dataReferencia)}</Text>
                                <Text style={[styles.colMoney, styles.cellText]}>{fmtBRL(row.saldoAnterior)}</Text>
                                <Text style={[styles.colMoney, styles.cellText]}>{fmtBRL(row.juros)}</Text>
                                <Text style={[styles.colMoney, styles.cellText]}>{fmtBRL(parseFloat(row.valorPago))}</Text>
                                {/* Coluna Amortização VERDE (#009e2a) */}
                                <Text style={[styles.colMoney, styles.cellText, { color: '#009e2a', fontWeight: 'bold' }]}>{fmtBRL(row.amortizacao)}</Text>
                                <Text style={[styles.colMoney, styles.cellText, { fontWeight: 'bold' }]}>{fmtBRL(row.saldoAtual)}</Text>
                            </View>
                        ))}

                        {/* Footer (Totais) */}
                        <View style={styles.tableFooter}>
                            <Text style={[styles.colIndex, { textAlign: 'left', paddingLeft: 4 }]}>TOTAIS</Text>
                            <View style={{ flex: 1 }} />
                            <Text style={styles.colMoney}>-</Text>
                            <Text style={styles.colMoney}>-</Text>
                            <Text style={styles.colMoney}>{fmtBRL(totalPago)}</Text>
                            <Text style={[styles.colMoney, { color: '#009e2a' }]}>{fmtBRL(totalAmortizado)}</Text>
                            <Text style={[styles.colMoney, { fontSize: 8 }]}>{fmtBRL(summary.saldoDevedorAtual)}</Text>
                        </View>
                    </View>
                </View>

                {/* Resumo Final */}
                <View style={styles.resultBox}>
                    <View style={styles.resultRow}>
                        <Text style={styles.resultTitle}>VALOR FINAL (Restituição em Dobro)</Text>
                        <Text style={styles.resultValue}>{fmtBRL(summary.valorRestituir)}</Text>
                    </View>
                </View>

                <Text style={{ marginTop: 20, fontSize: 8, color: '#666', textAlign: 'justify' }}>
                    Nota: O cálculo demonstra que, se aplicado o regime de amortização de empréstimo consignado padrão para quitar a dívida original, o saldo devedor teria sido extinto, gerando crédito ao consumidor. O valor final inclui a dobra legal sobre pagamentos indevidos após 30/03/2021 (se aplicável).
                </Text>
            </Page>
        </Document>
    );
};
