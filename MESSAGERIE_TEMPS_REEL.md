# Messagerie temps réel — Activation (CENSA)

Ce guide active la messagerie **réelle** : messages privés et de groupe qui
circulent entre membres, conservés (historique + réception hors ligne).

## Ce qui était en place
- `supabase.jsx` : connexion Supabase (auth + synchro) — **déjà configurée**
  (URL + clé anon renseignées).
- `realtime.js` : présence en ligne + appels audio/vidéo (WebRTC) — OK.
- Avant : les messages partaient en **diffusion éphémère** → perdus si l'ami
  n'était pas connecté au même instant, et **rien pour les groupes**.

## Ce qui a été ajouté
- Table Postgres `chat_messages` (persistance) + abonnement temps réel
  (`postgres_changes : INSERT`).
- Envoi persistant DM **et** groupe (`messages.jsx` → `CENSA_RT.sendMessage`).
- Chargement de l'historique à l'ouverture d'une conversation
  (`CENSA_RT.loadHistory`).
- Anti-doublon par identifiant de message (`mid`).

## ÉTAPE UNIQUE À FAIRE (1 minute)
1. Ouvrez **Supabase → SQL Editor → New query**.
2. Collez le contenu de **`censa/supabase_messages.sql`** et cliquez **Run**.
3. Rechargez le site. C'est tout.

Le script crée la table, ses index, les règles de sécurité (RLS) et inscrit la
table dans la publication Realtime. Il est **idempotent** (relançable sans
risque).

## Comment vérifier que ça marche
1. Connectez deux comptes différents (deux navigateurs, ou un onglet privé).
2. Devenez ami·e·s (se suivre).
3. Écrivez-vous : le message apparaît **en direct** chez l'autre.
4. Déconnectez l'un, envoyez-lui un message, reconnectez-le : il **reçoit
   l'historique** à l'ouverture de la conversation.

## Notes
- **Groupes** : les messages sont livrés aux membres qui ont le groupe dans
  leur liste. Le *partage de la liste de groupes* entre comptes relève d'un
  autre mécanisme (voir `supabase_patch2.sql`).
- **Sécurité des groupes** : par simplicité, les messages de groupe sont
  lisibles par tout compte authentifié, puis filtrés côté client. Pour un
  cloisonnement strict, ajoutez une table `group_members` et resserrez la
  règle RLS de lecture (indiqué en commentaire dans le `.sql`).
- Si Supabase est indisponible, l'app retombe automatiquement sur le
  fonctionnement local (aucun plantage).
