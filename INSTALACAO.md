# Instalação do perfil dinâmico da Alessandra

## Arquivos do pacote

```text
README.md
README.legacy.md
.github/
├── assets/
│   └── profile.svg
├── scripts/
│   └── generate-profile.mjs
└── workflows/
    └── profile.yml
```

O `README.legacy.md` contém uma cópia do perfil anterior.

## Opção 1 — pelo GitHub no navegador

1. Extraia o arquivo ZIP no computador.
2. Abra o repositório `AlessandraLima7/AlessandraLima7`.
3. Clique em **Add file → Upload files**.
4. Arraste para a página:
   - `README.md`
   - `README.legacy.md`
   - a pasta `.github` completa.
5. No campo de commit, escreva:

```text
feat(profile): adicionar painel dinâmico
```

6. Confirme o commit na branch `main`.
7. Abra a aba **Actions**.
8. Entre em **Atualizar perfil dinâmico**.
9. Aguarde a execução terminar com o ícone verde.
10. Atualize o perfil com `Ctrl + F5`.

O workflow também roda automaticamente em todo push na `main` e uma vez por dia.

## Opção 2 — usando Git

Execute no terminal dentro da pasta em que deseja trabalhar:

```bash
git clone https://github.com/AlessandraLima7/AlessandraLima7.git
cd AlessandraLima7
```

Copie os arquivos extraídos para dentro dessa pasta e execute:

```bash
git add README.md README.legacy.md .github
git commit -m "feat(profile): adicionar painel dinâmico"
git push origin main
```

## Caso o GitHub Actions não consiga fazer push

No repositório, abra:

```text
Settings
→ Actions
→ General
→ Workflow permissions
```

Marque:

```text
Read and write permissions
```

Depois salve e execute o workflow novamente na aba **Actions**.

## Personalização

Os textos e tecnologias ficam em:

```text
.github/scripts/generate-profile.mjs
```

Procure pelas constantes:

```js
const techs = [...]
```

E pelos textos:

```text
ALESSANDRA // LIMA
DESENVOLVEDORA EM FORMAÇÃO | ADS
```
