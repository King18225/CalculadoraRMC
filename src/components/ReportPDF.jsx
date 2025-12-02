import React from 'react';
import { Page, Text, View, Document, StyleSheet, Font } from '@react-pdf/renderer';

// Estilos do PDF
const styles = StyleSheet.create({
    page: { padding: 30, fontSize: 10, fontFamily: 'Helvetica' },
    header: { marginBottom: 20, borderBottom: '1px solid #ccc', paddingBottom: 10 },
    title: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 5 },
    subtitle: { fontSize: 10, color: '#666' },

    section: { marginBottom: 15 },
    sectionTitle: { fontSize: 12, fontWeight: 'bold', backgroundColor: '#f0f0f0', padding: 4, marginBottom: 5 },

    row: { flexDirection: 'row', marginBottom: 2 },
    label: { width: 120, fontWeight: 'bold' },
    value: { flex: 1 },

    // Tabela
    tableHeader: { flexDirection: 'row', backgroundColor: '#333', color: '#fff', padding: 4, fontSize: 8, fontWeight: 'bold' },
    tableRow: { flexDirection: 'row', borderBottom: '1px solid #eee', padding: 4, fontSize: 8 },
    colDate: { width: '15%' },
    colMoney: { width: '15%', textAlign: 'right' },
    colIndex: { width: '10%', textAlign: 'center' },

    // Totais
    summaryBox: { border: '1px solid #9cc094', padding: 10, marginTop: 10, borderRadius: 4 },
    summaryTitle: { fontSize: 14, color: '#166534', fontWeight: 'bold', marginBottom: 4 },
    summaryValue: { fontSize: 16, fontWeight: 'bold' },
});

const formatCurrency = (value) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return new Date(date.valueOf() + date.getTimezoneOffset() * 60000).toLocaleDateString('pt-BR');
};

export const ReportPDF = ({ client, contract, summary, evolution }) => (
    <Document>
        <Page size="A4" style={styles.page}>

            {/* CABEÇALHO */}
            <View style={styles.header}>
                <Text style={styles.title}>Relatório de Revisão RMC</Text>
                <Text style={styles.subtitle}>Gerado em: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}</Text>
            </View>

            {/* DADOS CADASTRAIS */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>1. Dados do Cliente e Contrato</Text>
                <View style={styles.row}>
                    <Text style={styles.label}>Cliente:</Text>
                    <Text style={styles.value}>{client.nome || 'Não informado'}</Text>
                    <Text style={styles.label}>CPF:</Text>
                    <Text style={styles.value}>{client.cpf || 'Não informado'}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.label}>Valor Empréstimo:</Text>
                    <Text style={styles.value}>{formatCurrency(contract.valorOriginal)}</Text>
                    <Text style={styles.label}>Data Início:</Text>
                    <Text style={styles.value}>{formatDate(contract.dataInicio)}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.label}>Taxa de Juros:</Text>
                    <Text style={styles.value}>{contract.taxaJuros}% a.m.</Text>
                    <Text style={styles.label}>Restituição em Dobro:</Text>
                    <Text style={styles.value}>{contract.restituicaoDobro ? 'Sim (após 03/2021)' : 'Não'}</Text>
                </View>
            </View>

            {/* RESULTADOS */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>2. Resumo da Análise</Text>
                <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.label}>Total Pago (Histórico):</Text>
                        <Text>{formatCurrency(summary.totalPago)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.label}>Saldo Devedor Recalculado:</Text>
                        <Text>{formatCurrency(summary.saldoDevedorAtual)}</Text>
                    </View>
                </View>

                <View style={styles.summaryBox}>
                    <Text style={styles.summaryTitle}>VALOR ESTIMADO A RESTITUIR</Text>
                    <Text style={styles.summaryValue}>{formatCurrency(summary.valorRestituir)}</Text>
                </View>
            </View>

            {/* TABELA DE EVOLUÇÃO */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>3. Evolução do Saldo Devedor (Memória de Cálculo)</Text>

                {/* Header da Tabela */}
                <View style={styles.tableHeader}>
                    <Text style={styles.colIndex}>#</Text>
                    <Text style={styles.colDate}>Data</Text>
                    <Text style={styles.colMoney}>Saldo Ant.</Text>
                    <Text style={styles.colMoney}>Juros</Text>
                    <Text style={styles.colMoney}>Valor Pago</Text>
                    <Text style={styles.colMoney}>Amortização</Text>
                    <Text style={styles.colMoney}>Saldo Atual</Text>
                </View>

                {/* Linhas */}
                {evolution.map((row, index) => (
                    <View key={index} style={[styles.tableRow, { backgroundColor: index % 2 === 0 ? '#fff' : '#f9f9f9' }]}>
                        <Text style={styles.colIndex}>{index + 1}</Text>
                        <Text style={styles.colDate}>{formatDate(row.dataReferencia)}</Text>
                        <Text style={styles.colMoney}>{formatCurrency(row.saldoAnterior)}</Text>
                        <Text style={styles.colMoney}>{formatCurrency(row.juros)}</Text>
                        <Text style={styles.colMoney}>{formatCurrency(row.valorPago)}</Text>
                        <Text style={[styles.colMoney, { color: row.amortizacao > 0 ? '#166534' : '#dc2626' }]}>
                            {formatCurrency(row.amortizacao)}
                        </Text>
                        <Text style={styles.colMoney}>{formatCurrency(row.saldoAtual)}</Text>
                    </View>
                ))}
            </View>

            <Text style={{ textAlign: 'center', marginTop: 20, fontSize: 8, color: '#999' }}>
                Este documento é uma simulação técnica baseada nos dados fornecidos.
            </Text>
        </Page>
    </Document>
);
