export type ContractType = 'servico' | 'aluguel' | 'venda'

export interface Party {
  nome: string
  documento?: string
  endereco?: string
  estadoCivil?: string
  profissao?: string
}


export interface Imovel {
  tipo?: string
  endereco?: string
  matricula?: string
  descricao?: string
  area?: string
}

export interface Valores {
  valor?: string
  formaPagamento?: string
  vencimento?: string
  multa?: string
  juros?: string
  reajuste?: string
}

export interface Contrato {
  id: string
  tipo: ContractType
  contratante: Party
  contratado: Party
  imovel?: Imovel
  valores?: Valores
  foro?: string
  textoContrato?: string
  status?: 'ativo' | 'encerrado'
  createdAt: string
}

export function generateContratoText(c: Contrato) {
  const tipo = c.tipo
  const contratante = c.contratante?.nome || 'CONTRATANTE'
  const contratado = c.contratado?.nome || 'CONTRATADO'
  const valor = c.valores?.valor || '---'
  const forma = c.valores?.formaPagamento || '---'
  const foro = c.foro || '---'

  if (tipo === 'servico') {
    return `Pelo presente instrumento particular de Contrato de Prestação de Serviços, as partes abaixo identificadas:\n\nCONTRATANTE: ${contratante}.\n\nCONTRATADO: ${contratado}.\n\nTêm entre si justo e contratado o que segue:\n\nCLÁUSULA PRIMEIRA – DO OBJETO\nO presente contrato tem como objeto a prestação de serviços.\n\nCLÁUSULA SEGUNDA – DO VALOR\nPelos serviços prestados, o CONTRATANTE pagará o valor de R$ ${valor}, na forma ${forma}.\n\nCLÁUSULA TERCEIRA – DO FORO\nFica eleito o foro da Comarca de ${foro}, para dirimir quaisquer questões oriundas deste contrato.\n\nE por estarem assim justos e contratados, assinam o presente instrumento.`
  }

  if (tipo === 'aluguel') {
    return generateContratoLocacao(c)
  }

  // venda
  return `Contrato de Compra e Venda:\n\nVENDEDOR: ${contratante}.\n\nCOMPRADOR: ${contratado}.\n\nOBJETO: ${c.imovel?.descricao || 'bem imóvel'}.\n\nPREÇO: R$ ${valor}.\n\nFORO: Fica eleito o foro da Comarca de ${foro}.`
}

function nl(text = '') {
  return text + "\n\n"
}

function safe(v?: string) {
  return v || '---'
}

function capitalize(str = '') {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function numberToWordsBR(n: number) {
  // simple converter for numbers up to 999.999.999
  const unidades = ['zero','um','dois','três','quatro','cinco','seis','sete','oito','nove','dez','onze','doze','treze','quatorze','quinze','dezesseis','dezessete','dezoito','dezenove']
  const dezenas = ['','','vinte','trinta','quarenta','cinquenta','sessenta','setenta','oitenta','noventa']
  const centenas = ['','cem','duzentos','trezentos','quatrocentos','quinhentos','seiscentos','setecentos','oitocentos','novecentos']

  function abaixoMil(num: number): string {
    if (num < 20) return unidades[num]
    if (num < 100) {
      const d = Math.floor(num / 10)
      const r = num % 10
      return r === 0 ? dezenas[d] : `${dezenas[d]} e ${unidades[r]}`
    }
    if (num === 100) return 'cem'
    const c = Math.floor(num / 100)
    const r = num % 100
    return r === 0 ? centenas[c] : `${centenas[c]} e ${abaixoMil(r)}`
  }

  if (n === 0) return 'zero'
  const partes: string[] = []
  const milhões = Math.floor(n / 1000000)
  const milhares = Math.floor((n % 1000000) / 1000)
  const resto = n % 1000

  if (milhões) {
    partes.push(milhões === 1 ? 'um milhão' : `${abaixoMil(milhões)} milhões`)
  }
  if (milhares) {
    partes.push(milhares === 1 ? 'mil' : `${abaixoMil(milhares)} mil`)
  }
  if (resto) {
    partes.push(abaixoMil(resto))
  }
  return partes.join(' e ')
}

function valorPorExtenso(valorStr?: string) {
  if (!valorStr) return '---'
  // remove non numbers, allow comma or dot as decimal
  const cleaned = String(valorStr).replace(/[R$\s\.]/g, '').replace(',', '.')
  const num = parseFloat(cleaned || '0')
  if (isNaN(num)) return '---'
  const inteiro = Math.floor(num)
  const centavos = Math.round((num - inteiro) * 100)
  const partes: string[] = []
  if (inteiro > 0) {
    partes.push(`${capitalize(numberToWordsBR(inteiro))} ${inteiro === 1 ? 'real' : 'reais'}`)
  }
  if (centavos > 0) {
    partes.push(`${capitalize(numberToWordsBR(centavos))} ${centavos === 1 ? 'centavo' : 'centavos'}`)
  }
  return partes.join(' e ') || 'zero reais'
}

export function generateContratoLocacao(c: Contrato) {
  const locador = c.contratante || ({} as any)
  const locatario = c.contratado || ({} as any)
  const imovel = c.imovel || {}
  const val = c.valores || {}
  const periodo = `${safe((c as any).periodo) || `${safe((c as any).prazo) || ''}`}`.trim()
  const inicio = (c as any).dataInicio || ''
  const termino = (c as any).dataTermino || ''
  const foro = safe(c.foro)

  // Build text according to provided template
  let text = ''
  text += 'CONTRATO DE LOCAÇÃO RESIDENCIAL\n\n'
  text += `LOCADOR: ${safe(locador.nome)}, ${safe(locador.estadoCivil || '')}, ${safe(locador.profissao || '')}${locador.documento ? `, CPF/RG ${locador.documento}` : ''}, residente e domiciliado em ${safe(locador.endereco)}.\n\n`
  text += `LOCATÁRIO: ${safe(locatario.nome)}, ${safe(locatario.estadoCivil || '')}, ${safe(locatario.profissao || '')}${locatario.documento ? `, CPF/RG ${locatario.documento}` : ''}, residente e domiciliado em ${safe(locatario.endereco)}.\n\n`

  text += 'As partes acima identificadas têm entre si justo e contratado o presente Contrato de Locação Residencial, que se regerá pelas cláusulas e condições a seguir.\n\n'

  // CLAUSULA 1 - OBJETO E DESTINAÇÃO
  text += 'CLÁUSULA PRIMEIRA – DO OBJETO E DESTINAÇÃO\n'
  text += `1.1 O LOCADOR dá em locação ao LOCATÁRIO o imóvel exclusivamente para fins residenciais, localizado em ${safe(imovel.endereco)}, do tipo ${safe(imovel.tipo)}, com área aproximada de ${safe(String(imovel.area))} m².\n\n`
  text += '1.2 O imóvel é composto por:\n'
  text += `${safe(String((imovel as any).quartos || '0'))} quarto(s)\n`
  text += `${safe(String((imovel as any).sala || '0'))} sala(s)\n`
  text += `${safe(String((imovel as any).cozinha || '0'))} cozinha(s)\n`
  text += `${safe(String((imovel as any).banheiros || '0'))} banheiro(s)\n`
  text += `${safe(String((imovel as any).lavanderia || '0'))} lavanderia(s)\n`
  text += `${safe(String((imovel as any).areaExterna || ''))}\n\n`
  text += '1.3 É expressamente vedada a utilização do imóvel para fins comerciais, industriais, religiosos ou de sublocação, total ou parcial, sem autorização expressa e por escrito do LOCADOR.\n\n'

  // CLAUSULA 2 - ESTADO DO IMÓVEL
  text += 'CLÁUSULA SEGUNDA – DO ESTADO DO IMÓVEL\n'
  const estadoItens = []
  if ((imovel as any).pinturaNova) estadoItens.push('pintura nova')
  if ((imovel as any).instalacoesOk) estadoItens.push('instalações elétricas e hidráulicas em pleno funcionamento')
  if ((imovel as any).portasJanelasOk) estadoItens.push('pisos, forro, portas, janelas, fechaduras e portões em perfeito estado de uso')
  text += `2.1 O LOCATÁRIO declara ter recebido o imóvel em perfeito estado de conservação, com: \n${estadoItens.map(i => `- ${i}`).join('\n')}\n\n`
  text += '2.2 O estado do imóvel encontra-se descrito no Laudo de Vistoria Inicial, que integra este contrato como Anexo I, sendo parte inseparável do mesmo.\n\n'

  // CLAUSULA 3 - PRAZO
  text += 'CLÁUSULA TERCEIRA – DO PRAZO\n'
  const prazoRaw = (c as any).prazo || periodo || '12'
  const prazoNum = String(prazoRaw).replace(/[^0-9]/g,'') || '12'
  const prazoExt = `${valorPorExtenso(prazoNum)} ${Number(prazoNum) === 1 ? 'mês' : 'meses'}`
  text += `3.1 O prazo da locação é de ${prazoNum} (${prazoExt}) meses, com início em ${safe(inicio)} e término em ${safe(termino)}.\n\n`

  // CLAUSULA 4 - VALOR E FORMA
  text += 'CLÁUSULA QUARTA – DO VALOR E FORMA DE PAGAMENTO\n'
  const valorExt = valorPorExtenso(val.valor)
  text += `4.1 O aluguel mensal é de R$ ${safe(val.valor)} (${valorExt}).\n\n`
  text += `4.2 O pagamento deverá ser efetuado até o dia ${safe(val.vencimento || '10')} de cada mês, por meio de ${safe(val.formaPagamento || 'transferência bancária')}.\n\n`
  text += `4.3 Dados bancários do LOCADOR:\nBanco: ${safe(val['banco'])}\nAgência: ${safe(val['agencia'])}\nConta: ${safe(val['conta'])}\nTipo: ${safe(val['tipoConta'])}\nChave Pix: ${safe(val['pix'] || '')}\n\n`
  text += `4.4 O atraso no pagamento acarretará:\n- multa de ${safe(val.multa || '2')}%;\n- juros de ${safe(val.juros || '1')}% ao mês;\n- correção monetária, se aplicável.\n\n`

  // CLAUSULA 5 - REAJUSTE
  text += 'CLÁUSULA QUINTA – DO REAJUSTE\n'
  text += `5.1 O valor do aluguel será reajustado anualmente, conforme: ${safe(val.reajuste || 'percentual fixo de 10% ou índice IPCA')}.\n\n`

  // CLAUSULA 6 - OBRIGAÇÕES DO LOCATÁRIO
  text += 'CLÁUSULA SEXTA – DAS OBRIGAÇÕES DO LOCATÁRIO\n'
  text += '6.1 São obrigações do LOCATÁRIO:\n- zelar pela conservação do imóvel;\n- não realizar obras ou modificações sem autorização do LOCADOR;\n- permitir vistorias mediante aviso prévio;\n- manter o imóvel limpo e conservado.\n\n'
  text += '6.2 Ao término da locação, o imóvel deverá ser devolvido:\n- pintado, na mesma cor ou padrão original;\n- limpo;\n- sem avarias, ressalvado o desgaste natural do uso regular.\n\n'

  // CLAUSULA 7 - BENFEITORIAS
  text += 'CLÁUSULA SÉTIMA – DAS BENFEITORIAS\n'
  text += '7.1 Qualquer benfeitoria somente poderá ser realizada mediante autorização expressa do LOCADOR.\n7.2 As benfeitorias realizadas não serão indenizáveis, incorporando-se ao imóvel.\n\n'

  // CLAUSULA 8 - DESPESAS
  text += 'CLÁUSULA OITAVA – DAS DESPESAS E ENCARGOS\n'
  text += `8.1 Compete ao LOCATÁRIO o pagamento de: ${safe((c as any).despesas || 'água, energia elétrica, gás, taxa de lixo, IPTU quando pactuado')}.\n\n`
  text += '8.2 Despesas estruturais e extraordinárias são de responsabilidade do LOCADOR.\n\n'

  // CLAUSULA 9 - INADIMPLÊNCIA
  text += 'CLÁUSULA NONA – DA INADIMPLÊNCIA\n'
  text += `9.1 O atraso superior a ${safe(String((c as any).diasInadimplencia || '30'))} dias ou a falta de pagamento por mais de ${safe(String((c as any).mesesInadimplencia || '1'))} meses caracteriza infração contratual grave, podendo ensejar rescisão e cobrança judicial.\n\n`

  // CLAUSULA 10 - RESCISÃO
  text += 'CLÁUSULA DÉCIMA – DA RESCISÃO\n'
  text += `10.1 A rescisão antecipada sujeitará a parte infratora à multa equivalente a ${safe(String((c as any).multaRescisao || '3'))} meses de aluguel, proporcional ao tempo restante do contrato.\n\n`
  text += `10.2 Exige-se aviso prévio mínimo de ${safe(String((c as any).avisoPrevioDias || '30'))} dias.\n\n`

  // CLAUSULA 11 - COMUNICAÇÕES
  text += 'CLÁUSULA DÉCIMA PRIMEIRA – DAS COMUNICAÇÕES\n'
  text += '11.1 As comunicações entre as partes poderão ocorrer por: e-mail; WhatsApp; endereço físico informado neste contrato.\n\n'

  // CLAUSULA 12 - FORO
  text += 'CLÁUSULA DÉCIMA SEGUNDA – DO FORO\n'
  text += `12.1 Fica eleito o foro da Comarca de ${foro}, renunciando as partes a qualquer outro, por mais privilegiado que seja.\n\n`

  // AVISO LEGAL
  text += 'AVISO LEGAL\n'
  text += 'Este contrato foi gerado automaticamente pelo sistema. Recomenda-se a revisão por profissional habilitado antes da assinatura.\n\n'

  text += 'E, por estarem assim justos e contratados, assinam o presente instrumento em duas vias de igual teor.\n\n'

  text += `LOCADOR: ${safe(locador.nome)}\nLOCATÁRIO: ${safe(locatario.nome)}\n\nData: ____/____/________\n\n`

  return text
}

const LS_KEY = 'contratos_v1'

export function loadContratos(): Contrato[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return []
    return JSON.parse(raw) as Contrato[]
  } catch (e) {
    return []
  }
}

export function saveContratos(list: Contrato[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(list))
}
