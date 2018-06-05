LeeKloud 2.0.0-alpha
========

# LeeKloud v2 n'est pas encore en release (LTS), est bientôt dans quelques jours

Une application en ligne de commande (via node) pour synchroniser vos IA se situant sur votre ordinateur vers le site leekwars.com

Une API pour synchroniser vos IA qui sont sur votre ordinateur avec le site [leekwars.com](leekwars.com).

Pour utiliser LeeKloud vous devez installer [nodejs](http://nodejs.org/).

Ensuite utilisez cette commande :

    node LeeKloud.js

LeeKloud v2 a été conçu pour travailler avec plusieurs espaces de travail dans le cas où vous avez plusieurs comptes.

LeeKloud va créer son répertoire selon l'emplacement courant du terminal que vous pouvez modifier avec la commande `cd` ou `ls`.

### Exemples :

Votre esplace de travail : `C:\Users\<user>\Desktop\MonEspaceDeTravail\compteA\`  
Emplacement de LeeKloud.js : `C:\Users\<user>\Desktop\LeeKloud\LeeKloud.js`

Commande à faire :

    cd C:\Users\<user>\Desktop\MonEspaceDeTravail\compteA\
    node ..\..\LeeKloud\LeeKloud.js

Il vous suffira ensuite de switcher de dossier compte A, B, C, D...

### Sous Windows :

    cd <c:\chemin\de\LeeKloud\>
    node LeeKloud.js

Sous Windows nous vous conseillons la version avec installateur *Windows Installer (.msi)*. Vous pouvez aussi utiliser la *version portable* avec *Windows Binary (.zip)*, il vous suffira juste de dezipper l'executable *node.exe* et le mettre dans le même répertoire que *LeeKloud.js*.

### Sous Linux :

	ls <\chemin\de\LeeKloud\>
	LeeKloud.js



### Problème avec la commande open

Sous windows, si vous avez un problème avec `.open [id]`, vous devez d'abord choisir un éditeur par defaut pour les fichiers ".lk".

Pour définir un programme par défaut : Clique droit sur un fichier ".lk" > "Ouvrir avec..." > "Choisir un programme par défaut...".



A voir aussi : https://github.com/GuimDev/LeekScript-Sublime

## En cas de problème :

1. Vérifiez que vous avez installer nodejs.
2. Vérifiez que vous avez bien défini le path d'environnement.
3. Utilisez la cmd tapez `node -v` (sans modifier le répertoire). Si la commande ne fonctionne pas vérifier l'étape 1 et 2.
