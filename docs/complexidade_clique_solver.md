# Estudo de Complexidade — `CliqueSolver.solve(graph)`

## 1. Objetivo da função

A função abaixo encontra o **maior clique** de um grafo por **força bruta**:

```ts
solve(graph: Graph): number[] {
  const verts = graph.vertices;
  const n = verts.length;
  for (let k = n; k >= 1; k--) {
    for (const subset of CliqueSolver.combinations(verts, k)) {
      if (CliqueSolver.isClique(graph, subset)) return subset;
    }
  }
  return [];
}
```

A estratégia é testar todos os subconjuntos de vértices, mas em **ordem decrescente de tamanho**.  
Isso permite **early exit**: assim que um clique é encontrado, ele já é o maior possível entre os subconjuntos ainda não testados.

---

## 2. Ideia central do algoritmo

O algoritmo faz duas coisas:

1. Varre os tamanhos possíveis de clique, de `n` até `1`.
2. Para cada tamanho `k`, gera todas as combinações de `k` vértices e verifica se cada combinação é clique.

Como o problema do clique máximo é exponencial, essa abordagem cresce muito rápido com o número de vértices.

---

## 3. Análise dos laços

### 3.1 Laço externo: `for (let k = n; k >= 1; k--)`

Esse laço percorre todos os tamanhos possíveis de subconjunto:

- começa em `k = n`
- termina em `k = 1`

Quantidade de iterações: **n**

Esse laço, isoladamente, seria linear.  
Mas ele controla um laço interno que explode combinatoriamente.

---

### 3.2 Laço interno: `for (const subset of combinations(verts, k))`

Para cada valor de `k`, a função `combinations(verts, k)` gera todas as combinações possíveis de `k` vértices dentre `n`.

A quantidade de subconjuntos de tamanho `k` é:

$$\binom{n}{k}$$

Então, para um `k` fixo, o custo do bloco é proporcional ao número de combinações:

$$\binom{n}{k}$$

Exemplos:

- `k = n` → 1 subconjunto
- `k = n-1` → `n` subconjuntos
- `k = n/2` → quantidade máxima, extremamente grande

---

### 3.3 Verificação de clique: `isClique(graph, subset)`

Para cada subconjunto gerado, a função `isClique` verifica se todos os pares de vértices estão conectados.

Se o subconjunto tem tamanho `k`, então o número de pares a conferir é:

$$\binom{k}{2} = \frac{k(k-1)}{2}$$

Logo, a checagem custa:

$$O(k^2)$$

Isso é importante porque o algoritmo não apenas gera subconjuntos; ele também faz uma validação quadrática para cada um.

---

## 4. Complexidade total

O custo total pode ser expresso por:

$$T(n) = \sum_{k=1}^{n} \binom{n}{k} \cdot O(k^2)$$

Usando a identidade combinatória:

$$\sum_{k=0}^{n} \binom{n}{k} k^2 = n(n+1)2^{n-2}$$

temos:

$$T(n) = O(n^2 \cdot 2^n)$$

Portanto, a complexidade assintótica no pior caso é:

## **Tempo: $O(n^2 \cdot 2^n)$**

---

## 5. Melhor caso, pior caso e caso médio

### Melhor caso
Se o grafo for completo, o primeiro subconjunto testado com `k = n` já é clique.

- gera 1 combinação
- `isClique` custa `O(n^2)`

**Melhor caso:** `O(n^2)`

---

### Pior caso
Se o grafo não tiver clique grande, ou se o clique máximo só aparecer muito tarde na enumeração, o algoritmo pode testar praticamente todos os subconjuntos.

Como o número total de subconjuntos não vazios é:

$$2^n - 1$$

e cada teste custa até `O(k^2)`, o custo total permanece exponencial.

**Pior caso:** `O(n^2 · 2^n)`

---

### Caso médio
Na prática, o caso médio também tende a ser exponencial, porque a enumeração de subconjuntos cresce rapidamente mesmo antes de chegar ao tamanho máximo do clique.

---

## 6. O efeito do `early exit`

O `return subset` interrompe a busca assim que um clique é encontrado.

Isso melhora o tempo **na prática**, porque:

- evita verificar combinações menores depois de achar o maior clique possível
- termina cedo em grafos densos

Mas o `early exit` **não muda a complexidade do pior caso**, porque ainda pode ser necessário testar muitas combinações antes de encontrar uma solução.

---

## 7. Complexidade de memória

A memória extra depende da implementação de `combinations` e de `isClique`.

Em geral:

- o grafo já existe em memória
- o algoritmo precisa guardar apenas o subconjunto atual e variáveis auxiliares

Logo, a memória adicional típica é:

## **Espaço: $O(n)$**

Se a função `combinations` materializar todas as combinações de uma vez, o uso de memória pode aumentar bastante.  
Se ela for geradora (`generator`/iterador), o custo de memória tende a permanecer baixo.

---

## 8. Resumo para slide

### Mensagem principal
O algoritmo é uma **busca exaustiva** sobre todos os subconjuntos de vértices.

### Complexidade
- **Melhor caso:** `O(n^2)`
- **Pior caso:** `O(n^2 · 2^n)`
- **Espaço extra:** `O(n)`

### Por que é caro?
Porque:
1. testa todos os tamanhos de subconjunto;
2. gera combinações em quantidade combinatória;
3. verifica cada subconjunto com custo quadrático.

### Conclusão
É um algoritmo correto e simples, mas inviável para grafos grandes.  
É adequado para fins didáticos e instâncias pequenas.

---

## 9. Frase curta para usar no slide

> O algoritmo percorre todos os subconjuntos de vértices em ordem decrescente de tamanho; para cada subconjunto, verifica se ele é clique. Isso leva a complexidade exponencial $O(n^2 \cdot 2^n)$ no pior caso.
