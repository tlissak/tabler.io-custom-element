# Direction 5 — « Assistant IA au centre »

Maquette statique du backoffice F4 Glasman où l'agent du projet est la porte d'entrée. Ouvrir `index.html` par double-clic ; aucune dépendance autre que Google Fonts (Inter) et les icônes Tabler (CDN). Données : `donnees.js` et `tokens.css` sont des copies identiques du kit `00-analyse/kit`.

## Le concept en 15 lignes

1. Le header garde ses 65 px mais les sept menus déroulants disparaissent : au centre, une **barre de commande** (clavier ou dictée, `Ctrl K` partout) adressée à l'agent, que nous appelons **Fil**.
2. L'accueil n'est plus « formulaires attribués + brouillons » : c'est un **briefing du matin** écrit pour la personne connectée (rôle, agence, portefeuille), en 3 à 6 paragraphes avec les chiffres réels et des cartes d'action.
3. On parle à l'agent en français (« prépare le devis Lenoir en location 6 mois », « expédie tout ce qui est prêt ») ; il répond en prose courte puis par des **cartes** qui portent les vraies actions du logiciel (créer, attribuer, relancer, imprimer, expédier).
4. Toute action qui écrit en base passe par un **aperçu** (« voici ce que je vais faire / ce que je ne ferai pas ») puis un bouton **Confirmer** ; l'action confirmée s'inscrit dans un **journal** auditable.
5. Les notifications ne sont plus des toasts : les événements bruts sont regroupés en un **récit** (« 3 choses ont changé depuis hier ») avec, pour chacun, « pourquoi vous ». Ce qui n'a pas besoin de la personne est résumé en une ligne « Sans vous ».
6. Chaque rôle a son briefing, ses **suggestions** (chips) et ses garde-fous : Direction arbitre, Vente relance et convertit, Préparation prend en charge et expédie, Technicien diagnostique et commande des pièces, Compta valide des relances en lot.
7. La **navigation classique** survit dans un rail gauche repliable : « Aujourd'hui », « Mon poste », puis un volet « Navigation classique » (Clients, les types de documents, Catalogue, Administration).
8. Les trois écrans clés (file de préparation, parc machines d'un client, suivi des paiements) restent des **écrans de repli** classiques (tableaux, filtres, boutons) coiffés d'une **couche agent** : lecture, risques, actions proposées, bandeau de conversation en bas.
9. Sous chaque réponse, les **sources** (compétences appelées, tables lues, heure des données) sont affichées. Un chiffre sans source n'est pas affiché.
10. L'agent crée des **brouillons** (devis, messages) ; l'envoi au client reste un geste humain.
11. Il refuse explicitement certaines demandes (relancer un client au contentieux, dépasser un seuil d'achat) et l'explique ; le refus est journalisé.
12. L'esthétique reste celle de F4 (Inter, primaire `#206bc4`, fond `#f6f8fb`, rayon 4 px) ; la seule signature de l'agent est une petite marque carrée au dégradé de la marque avec une aiguille enfilée. Pas d'étincelles, pas de violet.
13. La prose de l'agent est à 15 px / 1,55 pour rester lisible ; le reste de l'interface à 13–14 px. Les cartes sont plates (bordure, pas d'ombre) ; un liseré gauche ambre ou rouge marque le risque.
14. Tout fonctionne sans serveur : les tableaux sont rendus depuis `donnees.js`, les confirmations et le journal sont simulés en JS défensif (`shell.js`).
15. Une question libre dans le composeur reçoit une réponse honnête « non scénarisée » plutôt qu'une invention.

## Modèle de navigation

| Zone | Rôle | Contenu |
|---|---|---|
| **Barre de commande** (header, centre) | Point d'entrée universel | Saisie ou dictée ; `Ctrl K` ; Entrée pousse la demande dans la conversation de l'écran courant |
| **Rail gauche** (240 px → 56 px) | Repères + repli | « Aujourd'hui » (briefing, Depuis hier, journal) · « Mon poste — rôle » (3 à 5 files avec compteurs) · `details` « Navigation classique » (Clients, documents, catalogue, administration) · « Profils (démo) » pour changer de rôle dans la maquette |
| **Zone de travail** | Conversation ou écran de repli | Briefing = premier message de la journée ; échanges ; composeur collant en bas avec note « ne modifie rien sans confirmation » |
| **Panneau « Depuis hier »** (340 px, cloche) | Récit des notifications | 2 à 4 événements qui concernent la personne, « pourquoi vous », actions rapides, bloc « Sans vous » ; extrait du journal |
| **Écrans de repli** | Listes classiques | Même header et rail ; couche agent en tête (`agent-layer`) ; tableau(x) ; bandeau de conversation en pied |

## Modèle du briefing

Généré à heure fixe par rôle (Technicien 06:45, Préparation 07:30, Direction 07:58, Vente 08:01) et rafraîchissable. Structure fixe pour que l'œil s'y retrouve :

1. **Salutation + état en une phrase** avec le chiffre principal du rôle (CA du mois, devis en attente, commandes à préparer, interventions).
2. **Chiffres** (4 tuiles `figure`) tirés de `kpi`, `agences`, `commandes`, `devis`.
3. **Ce qui demande une décision** : 1 à 3 cartes de risque (liseré), chacune avec une action confirmable et une action de consultation.
4. **Ce qui bouge** : paragraphe + cartes « deux colonnes » (demandes web, échéance refusée, rupture, assemblage).
5. **Ce qui va bien** : une phrase pour ce qui s'est réglé sans intervention.
6. **Sources** : compétences et tables, mention « lecture seule ».

Puis les **suggestions** du rôle (5 chips) et un **échange exemple** avec étape de confirmation.

## Catalogue des cartes d'action

| Carte | Rôle(s) | Lecture (existant) | Écriture proposée (route / module) | Confirmation |
|---|---|---|---|---|
| Attribuer une demande ou une commande à quelqu'un | Direction, Vente | `search_orders`, `form_assignment` | `POST /f4/api/form/assign` (FormAssignment) + notification | Oui |
| Relancer un devis par e-mail (brouillon modifiable) | Vente | `get_order`, `get_contact`, `sent_mail` (ouvertures) | `POST /f3_form_email_send` (FormSend) + note « relance N1 » | Oui |
| Préparer un devis / devis (LOC) / devis maintenance | Vente | `get_contact`, `search_products`, `natural_product_search` | `create_quote_draft` (brouillon agent, puis Form) — jamais envoyé | Oui |
| Transmettre une demande web à une autre agence | Vente | `contact_devis` | `form_assign` sur la file de l'agence | Oui |
| Envoyer un lien de paiement (échéance refusée) | Vente, Compta | `form_payment` | PaymentLink | Oui |
| Prendre en charge / lancer la tournée (statut 25) + imprimer fiches et étiquettes | Préparation | vue `commande_a_preparer` | DashParts (statut), `PDF\PreparationSheet`, Colissimo / Chronopost | Oui |
| Expédier ce qui est prêt (étiquette, statut 11, facture VD, e-mail de suivi) | Préparation | vue `commande_a_preparer`, `form_payment` | DashParts expédition | Oui, liste exacte des commandes |
| Prévenir un collègue (rupture, changement) | Préparation, Direction | — | notification interne (+ e-mail) | Oui |
| Proposer un nouvel horaire au client (WhatsApp) et replanifier | Technicien | `intervention`, `client_machine` | module WhatsApp (existant) + `intervention` en attente d'accord | Oui |
| Démarrer un assemblage, sortir du stock | Technicien | FlowDashboard (process assemblage) | FlowDashboard étape + StockMovement | Oui |
| Réserver des pièces sur une intervention | Technicien | `search_products`, `stock` | StockMovement (réservation) | Oui |
| Valider et envoyer des relances en lot (N1 e-mail, N2 e-mail + WhatsApp) | Compta, Direction | `form` (reste à payer), `due_date` | FormSend / WhatsApp + table `relance` ; N3 exige la Direction | Oui, par lot |
| Créer un rappel pour soi ou un collègue | Tous | — | `notification` programmée | Oui |
| Ouvrir un écran, lire une fiche, exporter | Tous | `Stats`, listes | — | Non (lecture) |

Les compétences existantes dans `module/Agent/Skill` et utilisées en lecture : `search_orders`, `get_order`, `search_order_products`, `search_contacts`, `get_contact`, `search_products`, `natural_product_search`, `create_quote_draft` (écriture d'un brouillon agent, « ne crée pas de formulaire métier »), `save_skill_memory` (mémorisation d'un workflow réussi, utile pour les suggestions). Les routes `POST /api/agent/chat` et `/api/agent/json` portent la conversation et la génération structurée du briefing.

## Garde-fous

- **Aperçu avant écriture** : liste « ce que je vais faire » + « ce que je ne ferai pas », bouton Confirmer, bouton Annuler. Un lot est détaillé document par document.
- **Journal** : lectures, actions confirmées, annulations et refus, avec utilisateur, demande, compétence/route, résultat ; filtrable, exportable, conservé.
- **Règles « jamais »** affichées (`notifications.html`) : pas de relance au contentieux / sous promesse / client visité le jour même ; pas d'envoi de devis ou facture ; pas de modification de prix ; seuils d'achat par rôle ; périmètre de rôle et de site ; pas de chiffre sans source.
- **Diffusion maîtrisée** : réglages par type d'événement (rôles, cloche, digest, e-mail, WhatsApp, seuil).
- **Repli** : la navigation classique et les écrans de liste fonctionnent sans l'agent.

## Entités de base de données supposées (analyse.md §4)

- `notification` (id_user ou rôle, type, titre, détail, lien, lu_le, créé_le) + `notification_regle` (type, rôles, canaux, seuil).
- `client_machine` (id_client, id_product, n° série, date, type vente/location, fin garantie, id_form origine, site).
- `intervention` (id_machine, type, technicien, date planifiée, statut, compte rendu, pièces).
- `contrat_location` (id_machine, début, fin, loyer, échéances).
- `relance` (id_form, niveau, date, canal, par qui, brouillon) et `promesse_paiement` (id_form, montant, promis le, pour le, suivi).
- Vue `commande_a_preparer` (règle DashParts) avec étape et préparateur.
- `agent_action_log` (horodatage, utilisateur, demande, compétence, paramètres, résultat, confirmé/annulé/refusé) et `agent_briefing` (rôle, utilisateur, date, contenu, sources).
- Lecture effective de `due_date`, `user_site` et `form_assignment`.

## Avantages, inconvénients, risques

**Pour** : une seule porte d'entrée pour tous les rôles, y compris Compta et Technicien aujourd'hui enfermés ; les tâches viennent à la personne au lieu d'être cherchées dans 19 listes ; les briques existantes (DashParts, FormSend, FormAssignment, Agent) sont réutilisées plutôt que remplacées ; les écrans classiques restent ; la dictée convient au quai et à la route.

**Contre** : dépendance à un modèle (coût par requête, latence, disponibilité) ; une conversation est moins dense qu'un tableau pour les gros volumes (803 brouillons de devis) ; le briefing ajoute une couche à maintenir (prompts, règles, tests) ; changement d'habitudes marqué pour des équipes qui connaissent la navigation par type de document.

**Risques et parades** :
- *Hallucination* : le briefing est généré à partir de requêtes SQL structurées (JSON), le modèle ne fait que rédiger ; chaque chiffre porte sa source ; tout ce qui écrit passe par des compétences typées et une confirmation ; une demande hors scénario reçoit « je ne sais pas ».
- *Confiance* : journal complet, refus expliqués, règles « jamais » publiques, possibilité de désactiver l'agent par rôle et de retomber sur les listes.
- *Coût* : briefings générés une fois par jour et par personne (une trentaine de personnes), mise en cache, modèle local (Ollama / OpenWebUI déjà prévu dans `module/Agent`) pour le routage et le résumé, modèle distant seulement pour la rédaction si nécessaire.
- *Sécurité* : l'agent s'exécute avec les droits de la personne connectée (rôle, site), jamais en super-utilisateur ; les routes d'écriture gardent leurs contrôles.
- *Dictée* : reconnaissance côté navigateur, texte toujours relu avant envoi.

## Fichiers

- `index.html` — présentation, parcours d'une demande, liens vers tous les écrans.
- `direction.html`, `vente.html`, `preparation.html`, `technicien.html` — briefing + conversation par profil.
- `file-preparation.html`, `parc-machines.html`, `paiements.html` — écrans de repli avec couche agent.
- `notifications.html` — modèle de notification, réglages, journal d'audit, règles « jamais ».
- `styles.css` (shell partagé), `shell.js` (rail, panneau, confirmations, journal, composeur), `tokens.css` et `donnees.js` (copies du kit).
